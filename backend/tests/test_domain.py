from app.models import (
    Product, DistributorCatalogueItem, Order, OrderItem, Category
)
import pytest
from sqlalchemy.exc import IntegrityError

def test_product_identity_independence(db, seed_data):
    # A canonical product should appear in multiple catalogues
    prods = db.query(Product).filter(Product.normalized_name == "paneer").all()
    assert len(prods) == 1
    
    paneer = prods[0]
    catalogue_items = db.query(DistributorCatalogueItem).filter(DistributorCatalogueItem.product_id == paneer.id).all()
    
    assert len(catalogue_items) == 2
    prices = [item.selling_price for item in catalogue_items]
    assert 320.0 in prices
    assert 315.0 in prices

def test_order_preserves_historical_price(db, seed_data):
    profs = seed_data["profs"]
    ret = profs["ret_1"]
    dist = profs["dist_1"]
    
    # Sharma sells milk 500ml
    milk_cat = db.query(DistributorCatalogueItem).filter(DistributorCatalogueItem.distributor_id == dist.id, DistributorCatalogueItem.selling_price == 25.0).first()
    
    order = Order(retailer_id=ret.id, distributor_id=dist.id, order_number="ORD-001", total=250.0)
    db.add(order)
    db.commit()
    
    # Create order item
    item = OrderItem(
        order_id=order.id, 
        product_id=milk_cat.product_id, 
        product_variant_id=milk_cat.product_variant_id, 
        catalogue_item_id=milk_cat.id,
        quantity=10,
        unit_price=milk_cat.selling_price, # Snapshot price!
        line_total=250.0
    )
    db.add(item)
    db.commit()
    
    # Fast forward: Distributor increases price
    milk_cat.selling_price = 30.0
    db.commit()
    
    # Verify order price has not changed
    db.refresh(item)
    assert item.unit_price == 25.0

def test_multi_product_order(db, seed_data):
    profs = seed_data["profs"]
    ret = profs["ret_1"]
    dist = profs["dist_2"] # Gupta
    
    items = db.query(DistributorCatalogueItem).filter(DistributorCatalogueItem.distributor_id == dist.id).all()
    assert len(items) == 2
    
    order = Order(retailer_id=ret.id, distributor_id=dist.id, order_number="ORD-002", total=1000.0)
    db.add(order)
    db.commit()
    
    order_items = []
    for item in items:
        order_items.append(OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_variant_id=item.product_variant_id,
            catalogue_item_id=item.id,
            quantity=item.minimum_order_quantity,
            unit_price=item.selling_price,
            line_total=item.minimum_order_quantity * item.selling_price
        ))
    db.add_all(order_items)
    db.commit()
    
    db.refresh(order)
    assert len(order.items) == 2

def test_negative_price_constraint(db, seed_data):
    profs = seed_data["profs"]
    dist = profs["dist_1"]
    milk = db.query(Product).filter(Product.normalized_name == "milk").first()
    variant = milk.variants[0]
    
    bad_item = DistributorCatalogueItem(
        distributor_id=dist.id,
        product_id=milk.id,
        product_variant_id=variant.id,
        selling_price=-10.0, # INVALID
        minimum_order_quantity=1
    )
    db.add(bad_item)
    with pytest.raises(IntegrityError):
        db.commit()
