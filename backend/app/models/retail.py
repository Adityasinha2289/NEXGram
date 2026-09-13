"""The retailer's own shop: shelf stock, what leaves it, and who buys it.

Everything else in the schema models the *wholesale* side - a distributor's
catalogue, and orders a retailer places against it. These tables model the shop
itself: what is on the shelf right now, which batch of it expires when, every
movement in and out, and the walk-up customer who buys it.

The split matters because the two sides answer different questions.
`DistributorCatalogueItem.available_stock` is "what can I sell you wholesale";
`RetailerInventory.quantity` is "what is in my shop". Conflating them is what
makes a restock suggestion tell a shopkeeper to order something they already
have three cartons of.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class RetailerInventory(Base):
    """One product variant on one shop's shelf.

    Quantity is the sum of its open batches and is maintained alongside them, so
    the common read ("how many do I have") is one row rather than an aggregate
    over every batch ever received.
    """

    __tablename__ = "retailer_inventory"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), index=True, nullable=False)
    product_variant_id = Column(String, ForeignKey("product_variants.id"), index=True, nullable=False)

    quantity = Column(Integer, default=0, nullable=False)

    # What the shop paid, and what it charges. Both are needed to tell a
    # shopkeeper whether a line actually makes them money.
    unit_cost = Column(Float, nullable=True)
    selling_price = Column(Float, nullable=True)

    # Below this, the restock engine starts suggesting it. Defaults are derived
    # from observed sales rather than guessed at signup.
    reorder_level = Column(Integer, default=0, nullable=False)

    # Days from receipt that this product stays saleable. Used to date a batch
    # when a delivery arrives without an explicit expiry printed on it.
    shelf_life_days = Column(Integer, nullable=True)

    # Whether a walk-up customer can see and order this online.
    is_listed_online = Column(Boolean, default=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    retailer = relationship("RetailerProfile")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    batches = relationship(
        "InventoryBatch", back_populates="inventory", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # One shelf row per variant per shop: two rows for the same milk means
        # two different answers to "how many do I have".
        UniqueConstraint("retailer_id", "product_variant_id", name="uq_retailer_variant"),
        CheckConstraint("quantity >= 0", name="check_retailer_inventory_quantity"),
        CheckConstraint("reorder_level >= 0", name="check_retailer_reorder_level"),
        Index("ix_retailer_inventory_shop_listed", "retailer_id", "is_listed_online"),
    )


class InventoryBatch(Base):
    """A lot of stock received together, with its own expiry.

    Shelf life is per batch, not per product: the milk received on Monday and
    the milk received on Thursday are the same product and expire on different
    days. Sales draw from the batch expiring soonest, so what is sold is what
    would otherwise have been thrown away.
    """

    __tablename__ = "inventory_batches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inventory_id = Column(
        String, ForeignKey("retailer_inventory.id", ondelete="CASCADE"), index=True, nullable=False
    )

    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=True)

    received_on = Column(Date, nullable=False, default=lambda: datetime.now(timezone.utc).date())
    # Null means the shop does not track an expiry for this line (soap, matches).
    expires_on = Column(Date, nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    inventory = relationship("RetailerInventory", back_populates="batches")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_batch_quantity_positive"),
    )


# Why stock moved. Kept as plain strings rather than an enum so a new reason
# never needs a migration, but the set is closed in `movements.REASONS`.
MOVEMENT_SALE_VOICE = "sale_voice"
MOVEMENT_SALE_COUNTER = "sale_counter"
MOVEMENT_SALE_ONLINE = "sale_online"
MOVEMENT_RESTOCK = "restock"
MOVEMENT_WASTAGE = "wastage"
MOVEMENT_CORRECTION = "correction"
MOVEMENT_RETURN = "return"


class StockMovement(Base):
    """Every change to a shelf quantity, and what caused it.

    The ledger is what makes the rest of the shop features honest: sales rate is
    counted from real movements rather than assumed, wastage is visible next to
    the expiry that caused it, and a voice entry that got the wrong product can
    be traced back to the sentence that produced it.
    """

    __tablename__ = "stock_movements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=False)
    inventory_id = Column(String, ForeignKey("retailer_inventory.id"), index=True, nullable=False)

    # Negative leaves the shelf, positive arrives on it.
    quantity_delta = Column(Integer, nullable=False)
    reason = Column(String, nullable=False, index=True)

    unit_price = Column(Float, nullable=True)
    total_value = Column(Float, nullable=True)

    # For a voice sale, the sentence it came from - so a wrong deduction can be
    # explained rather than just reversed.
    source_text = Column(Text, nullable=True)
    reference_id = Column(String, nullable=True, index=True)
    note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    inventory = relationship("RetailerInventory")

    __table_args__ = (
        CheckConstraint("quantity_delta != 0", name="check_movement_nonzero"),
        Index("ix_stock_movement_shop_time", "retailer_id", "created_at"),
    )


class CustomerProfile(Base):
    """A household buying from a nearby shop.

    Deliberately thin. The delivery is a boy on a bicycle covering a couple of
    kilometres, so the useful address is a landmark and a phone number, not a
    geocoded street. Latitude and longitude are optional and only used to rank
    shops by distance when the phone supplies them.
    """

    __tablename__ = "customer_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)

    address_line = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="customer_profile")
    location = relationship("Location")


class DeliveryRunner(Base):
    """The shop's delivery boy - the "chotu".

    Belongs to one shop. Capability is a mode rather than a vehicle record
    because it is what decides how far an order can go: a bicycle covers a
    wider radius than someone walking, and nothing here covers a district.
    """

    __tablename__ = "delivery_runners"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=False)

    name = Column(String, nullable=False)
    mobile = Column(String, nullable=True)
    # "walk" or "cycle". Anything further needs a different kind of delivery.
    mode = Column(String, default="cycle", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    retailer = relationship("RetailerProfile")


# A consumer order's lifecycle. Short on purpose: the shop is a few streets
# away, so anything longer describes a courier network this is not.
CONSUMER_STATUSES = ["placed", "accepted", "out_for_delivery", "delivered", "cancelled", "rejected"]


class ConsumerOrder(Base):
    """A household's order from one nearby shop, delivered by that shop."""

    __tablename__ = "consumer_orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = Column(String, unique=True, index=True, nullable=False)

    customer_id = Column(String, ForeignKey("customer_profiles.id"), index=True, nullable=False)
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=False)
    runner_id = Column(String, ForeignKey("delivery_runners.id"), nullable=True)

    status = Column(String, default="placed", nullable=False, index=True)

    subtotal = Column(Float, default=0.0, nullable=False)
    delivery_fee = Column(Float, default=0.0, nullable=False)
    total = Column(Float, default=0.0, nullable=False)

    # Snapshotted at checkout: the address the runner was actually given, which
    # must not change if the customer later edits their profile.
    delivery_address = Column(String, nullable=True)
    delivery_landmark = Column(String, nullable=True)
    distance_km = Column(Float, nullable=True)
    customer_note = Column(Text, nullable=True)

    placed_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancel_reason = Column(Text, nullable=True)

    customer = relationship("CustomerProfile")
    retailer = relationship("RetailerProfile")
    runner = relationship("DeliveryRunner")
    items = relationship(
        "ConsumerOrderItem", back_populates="order", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("total >= 0", name="check_consumer_order_total"),
        Index("ix_consumer_order_shop_status", "retailer_id", "status"),
    )


class ConsumerOrderItem(Base):
    """One line of a consumer order, with its price frozen at checkout."""

    __tablename__ = "consumer_order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(
        String, ForeignKey("consumer_orders.id", ondelete="CASCADE"), index=True, nullable=False
    )
    inventory_id = Column(String, ForeignKey("retailer_inventory.id"), nullable=False)

    product_name = Column(String, nullable=False)
    variant_name = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    line_total = Column(Float, nullable=False)

    order = relationship("ConsumerOrder", back_populates="items")
    inventory = relationship("RetailerInventory")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_consumer_item_quantity"),
        CheckConstraint("unit_price >= 0", name="check_consumer_item_price"),
    )


# Where a loan application has got to. The platform never decides eligibility;
# it records what the user told us and what the lender came back with.
LOAN_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"]


class LoanApplication(Base):
    """A retailer's or distributor's application against a listed scheme.

    The platform is not the lender. This records the intent, the paperwork the
    scheme asks for, and whatever the bank reported back, so a shopkeeper has
    one place showing where their application stands instead of a phone number
    and a memory.
    """

    __tablename__ = "loan_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    reference = Column(String, unique=True, index=True, nullable=False)

    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    scheme_id = Column(String, nullable=False, index=True)
    scheme_name = Column(String, nullable=False)

    amount = Column(Float, nullable=False)
    tenure_months = Column(Integer, nullable=False)
    purpose = Column(Text, nullable=True)

    status = Column(String, default="submitted", nullable=False, index=True)
    # What the scheme's own criteria said at the moment of applying, so a later
    # profile edit cannot rewrite the basis on which this was submitted.
    matched_criteria = Column(Text, nullable=True)
    lender_reference = Column(String, nullable=True)
    decision_note = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    decided_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_loan_amount_positive"),
        CheckConstraint("tenure_months > 0", name="check_loan_tenure_positive"),
    )
