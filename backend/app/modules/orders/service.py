from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.core import audit
from app.modules.distributors.service import derive_stock_status
from app.models import Order, OrderItem, OrderStatusHistory, DistributorCatalogueItem, RetailerProfile, DistributorProfile
from app.modules.orders import schemas
import datetime

def generate_order_number(db: Session) -> str:
    # simple generator for demo: NEX-YYYYMMDD-HHMMSS-ID
    now = datetime.datetime.now()
    count = db.query(Order).count() + 1
    return f"NEX-{now.strftime('%Y%m%d')}-{count:04d}"

def get_orders(db: Session, skip: int = 0, limit: int = 20, retailer_id: str = None, distributor_id: str = None):
    query = db.query(Order)
    if retailer_id:
        query = query.filter(Order.retailer_id == retailer_id)
    if distributor_id:
        query = query.filter(Order.distributor_id == distributor_id)
        
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # We need to populate retailer_name and distributor_name for the summary
    # Since relationships aren't eagerly loaded or directly available on Order without joins,
    # let's map it. 
    # Actually, Order model does not have relationship for retailer and distributor defined directly in commerce.py!
    # Wait, in commerce.py: RetailerDistributorRelationship has them, but Order doesn't.
    # Let me add relationships dynamically or just fetch manually here.
    
    # Let's fetch profiles to map names
    retailer_ids = {o.retailer_id for o in orders}
    distributor_ids = {o.distributor_id for o in orders}
    
    retailers = db.query(RetailerProfile).filter(RetailerProfile.id.in_(retailer_ids)).all()
    distributors = db.query(DistributorProfile).filter(DistributorProfile.id.in_(distributor_ids)).all()
    
    r_map = {r.id: r.business_name for r in retailers}
    d_map = {d.id: d.business_name for d in distributors}
    
    summaries = []
    for o in orders:
        items_count = db.query(OrderItem).filter(OrderItem.order_id == o.id).count()
        summaries.append({
            "id": o.id,
            "order_number": o.order_number,
            "retailer_id": o.retailer_id,
            "distributor_id": o.distributor_id,
            "retailer_name": r_map.get(o.retailer_id, "Unknown"),
            "distributor_name": d_map.get(o.distributor_id, "Unknown"),
            "status": o.status,
            "item_count": items_count,
            "subtotal": o.subtotal,
            "total": o.total,
            "created_at": o.created_at,
            "updated_at": o.updated_at
        })
    
    return summaries, total

def get_order_detail(db: Session, order_id: str):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product),
        joinedload(Order.items).joinedload(OrderItem.variant),
        joinedload(Order.history)
    ).filter(Order.id == order_id).first()
    
    if not order:
        return None
        
    retailer = db.query(RetailerProfile).filter(RetailerProfile.id == order.retailer_id).first()
    distributor = db.query(DistributorProfile).filter(DistributorProfile.id == order.distributor_id).first()
    
    # Map items
    items = []
    for item in order.items:
        items.append({
            "id": item.id,
            "catalogue_item_id": item.catalogue_item_id,
            "product_name": item.product.canonical_name,
            "variant_name": item.variant.variant_name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "line_total": item.line_total
        })
        
    history = []
    # sort history by created_at
    for h in sorted(order.history, key=lambda x: x.created_at):
        history.append({
            "id": h.id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "changed_by": h.changed_by,
            "reason": h.reason,
            "created_at": h.created_at
        })

    return {
        "id": order.id,
        "order_number": order.order_number,
        "retailer_id": order.retailer_id,
        "distributor_id": order.distributor_id,
        "retailer_name": retailer.business_name if retailer else "Unknown",
        "distributor_name": distributor.business_name if distributor else "Unknown",
        "status": order.status,
        "item_count": len(items),
        "subtotal": order.subtotal,
        "total": order.total,
        "notes": order.notes,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "accepted_at": order.accepted_at,
        "completed_at": order.completed_at,
        "cancelled_at": order.cancelled_at,
        "items": items,
        "history": history
    }

def create_order(db: Session, order_in: schemas.OrderCreate):
    try:
        # Start transaction is implicit in SQLAlchemy Session, we commit at the end.
        
        # 1. Validate retailer and distributor
        if not db.query(RetailerProfile).filter(RetailerProfile.id == order_in.retailer_id).first():
            raise HTTPException(status_code=404, detail="Retailer not found")
        if not db.query(DistributorProfile).filter(DistributorProfile.id == order_in.distributor_id).first():
            raise HTTPException(status_code=404, detail="Distributor not found")

        # 2. Extract item IDs to lock rows (to prevent concurrent catalogue updates)
        cat_ids = [item.catalogue_item_id for item in order_in.items]
        
        # Lock rows in DB to prevent concurrent modifications (e.g. price change during order)
        # Using with_for_update() to lock these rows
        catalogue_items = db.query(DistributorCatalogueItem).filter(
            DistributorCatalogueItem.id.in_(cat_ids)
        ).with_for_update().all()
        
        cat_map = {item.id: item for item in catalogue_items}

        subtotal = 0.0
        db_items = []
        
        for requested_item in order_in.items:
            cat_item = cat_map.get(requested_item.catalogue_item_id)
            
            # Validation: Exists
            if not cat_item:
                raise HTTPException(status_code=404, detail=f"Catalogue item {requested_item.catalogue_item_id} not found")
            
            # Validation: Active
            if not cat_item.is_active or not cat_item.is_available:
                raise HTTPException(status_code=400, detail=f"Item {requested_item.catalogue_item_id} is inactive or unavailable")
                
            # Validation: Ownership
            if cat_item.distributor_id != order_in.distributor_id:
                raise HTTPException(status_code=400, detail=f"Item {requested_item.catalogue_item_id} does not belong to distributor {order_in.distributor_id}")
                
            # Validation: MOQ
            if requested_item.quantity < cat_item.minimum_order_quantity:
                raise HTTPException(status_code=400, detail=f"Quantity for item {requested_item.catalogue_item_id} is below MOQ ({cat_item.minimum_order_quantity})")
                
            # Validation: Stock 
            if requested_item.quantity > cat_item.available_stock:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for item {requested_item.catalogue_item_id}. Available: {cat_item.available_stock}")
                
            # Price Snapshot & Line total
            line_total = cat_item.selling_price * requested_item.quantity
            subtotal += line_total
            
            db_item = OrderItem(
                product_id=cat_item.product_id,
                product_variant_id=cat_item.product_variant_id,
                catalogue_item_id=cat_item.id,
                quantity=requested_item.quantity,
                unit_price=cat_item.selling_price, # Snapshot!
                line_total=line_total
            )
            db_items.append(db_item)

        # Create Order
        db_order = Order(
            retailer_id=order_in.retailer_id,
            distributor_id=order_in.distributor_id,
            order_number=generate_order_number(db),
            status="requested", # Defaulting directly to requested instead of draft for the initial submission
            subtotal=subtotal,
            total=subtotal,
            notes=order_in.notes
        )
        db.add(db_order)
        db.flush() # get id
        
        # Attach items
        for item in db_items:
            item.order_id = db_order.id
            db.add(item)
            
        # Create history
        history = OrderStatusHistory(
            order_id=db_order.id,
            previous_status="draft",
            new_status="requested",
            reason="Order initially submitted"
        )
        db.add(history)

        audit.record(
            db,
            action="order.created",
            entity_type="order",
            entity_id=db_order.id,
            actor_id=order_in.retailer_id,
            metadata={
                "order_number": db_order.order_number,
                "distributor_id": db_order.distributor_id,
                "total": subtotal,
                "item_count": len(db_items),
            },
        )

        db.commit()
        return get_order_detail(db, db_order.id)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def update_order_status(db: Session, order_id: str, update_in: schemas.OrderStatusUpdate):
    # Valid transitions
    VALID_TRANSITIONS = {
        "requested": ["accepted", "rejected", "cancelled"],
        "accepted": ["preparing", "cancelled"],
        "preparing": ["ready", "cancelled"],
        "ready": ["completed"],
        "completed": [],
        "cancelled": [],
        "rejected": []
    }

    try:
        order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
            
        if update_in.status not in VALID_TRANSITIONS.get(order.status, []):
            raise HTTPException(status_code=400, detail=f"Invalid transition from {order.status} to {update_in.status}")
            
        old_status = order.status
        
        # INVENTORY LOGIC: Decrement stock on "accepted"
        if update_in.status == "accepted":
            for item in order.items:
                cat_item = db.query(DistributorCatalogueItem).filter(DistributorCatalogueItem.id == item.catalogue_item_id).with_for_update().first()
                if not cat_item:
                    raise HTTPException(status_code=404, detail=f"Catalogue item {item.catalogue_item_id} not found during acceptance")
                    
                if cat_item.available_stock < item.quantity:
                    raise HTTPException(status_code=409, detail=f"Insufficient stock for catalogue item {item.catalogue_item_id} during acceptance. Available: {cat_item.available_stock}")
                    
                cat_item.available_stock -= item.quantity
                # Stock level and stock label must move together: an item left
                # marked "available" at zero stock is counted as real supply by
                # the supply-gap engine and closes a gap that is still open.
                cat_item.stock_status = derive_stock_status(cat_item.available_stock)
                cat_item.is_available = cat_item.available_stock > 0
                
        # Timestamp logic
        now = datetime.datetime.now()
        if update_in.status == "accepted":
            order.accepted_at = now
        elif update_in.status == "completed":
            order.completed_at = now
        elif update_in.status in ["cancelled", "rejected"]:
            order.cancelled_at = now
            
            # Revert stock if cancelled AFTER accepted
            if old_status in ["accepted", "preparing", "ready"]:
                for item in order.items:
                    cat_item = db.query(DistributorCatalogueItem).filter(DistributorCatalogueItem.id == item.catalogue_item_id).with_for_update().first()
                    if cat_item:
                        cat_item.available_stock += item.quantity
                        cat_item.stock_status = derive_stock_status(cat_item.available_stock)
                        cat_item.is_available = cat_item.available_stock > 0
            
        order.status = update_in.status
        
        # History
        history = OrderStatusHistory(
            order_id=order.id,
            previous_status=old_status,
            new_status=update_in.status,
            changed_by=update_in.changed_by,
            reason=update_in.reason
        )
        db.add(history)

        audit.record(
            db,
            action=f"order.{update_in.status}",
            entity_type="order",
            entity_id=order.id,
            actor_id=update_in.changed_by,
            metadata={
                "order_number": order.order_number,
                "from": old_status,
                "to": update_in.status,
                "reason": update_in.reason,
            },
        )

        db.commit()
        return get_order_detail(db, order.id)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
