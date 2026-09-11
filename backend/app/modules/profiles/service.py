from sqlalchemy.orm import Session
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile, Location
from app.modules.profiles import schemas

def get_or_create_location(db: Session, location_data: schemas.LocationBase, existing_loc_id: str = None) -> str:
    if not location_data:
        return existing_loc_id
    
    if existing_loc_id:
        loc = db.query(Location).filter_by(id=existing_loc_id).first()
        if loc:
            if location_data.area is not None: loc.area = location_data.area
            if location_data.block is not None: loc.block = location_data.block
            if location_data.district is not None: loc.district = location_data.district
            if location_data.state is not None: loc.state = location_data.state
            if location_data.pin is not None: loc.pincode = location_data.pin
            db.commit()
            return loc.id
            
    # Create new
    loc = Location(
        area=location_data.area,
        block=location_data.block,
        district=location_data.district,
        state=location_data.state,
        pincode=location_data.pin
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc.id

def update_retailer_profile(db: Session, user: User, profile: RetailerProfile, update_data: schemas.RetailerProfileUpdate):
    if update_data.name: user.name = update_data.name
    if update_data.mobile: user.mobile = update_data.mobile
    
    if update_data.business_name: profile.business_name = update_data.business_name
    if update_data.business_type: profile.business_type = update_data.business_type
    if update_data.monthly_sales_range: profile.monthly_sales_range = update_data.monthly_sales_range
    if update_data.purchase_frequency: profile.purchase_frequency = update_data.purchase_frequency
    if update_data.investment_budget: profile.investment_budget = update_data.investment_budget
    if update_data.existing_supplier_type: profile.existing_supplier_type = update_data.existing_supplier_type
    
    if update_data.demanded_categories is not None: profile.demanded_categories = update_data.demanded_categories
    if update_data.unmet_needs is not None: profile.unmet_needs = update_data.unmet_needs
    if update_data.requirements is not None: profile.requirements = update_data.requirements
    
    if update_data.location:
        profile.location_id = get_or_create_location(db, update_data.location, profile.location_id)
        
    db.add(user)
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)

def update_distributor_profile(db: Session, user: User, profile: DistributorProfile, update_data: schemas.DistributorProfileUpdate):
    if update_data.contact_name: user.name = update_data.contact_name
    if update_data.mobile: user.mobile = update_data.mobile
    
    if update_data.business_name: profile.business_name = update_data.business_name
    if update_data.business_category: profile.business_category = update_data.business_category
    if update_data.service_radius: profile.service_radius = update_data.service_radius
    if update_data.custom_radius is not None: profile.custom_radius = update_data.custom_radius
    if update_data.minimum_order_range: profile.minimum_order_range = update_data.minimum_order_range
    if update_data.custom_min_order is not None: profile.custom_min_order = update_data.custom_min_order
    if update_data.retailer_coverage: profile.retailer_coverage = update_data.retailer_coverage
    
    if update_data.product_categories is not None: profile.product_categories = update_data.product_categories
    if update_data.delivery_capabilities is not None: profile.delivery_capabilities = update_data.delivery_capabilities
    if update_data.stock_capacity is not None: profile.stock_capacity = update_data.stock_capacity
    
    if update_data.location:
        profile.location_id = get_or_create_location(db, update_data.location, profile.location_id)
        
    db.add(user)
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)

def get_retailer_completeness(profile: RetailerProfile) -> schemas.ProfileCompletenessResponse:
    missing = []
    if not profile.business_name: missing.append("business_name")
    if not profile.business_type: missing.append("business_type")
    if not profile.location_id: missing.append("location")
    if not profile.demanded_categories or len(profile.demanded_categories) == 0: missing.append("demanded_categories")
    
    return schemas.ProfileCompletenessResponse(
        profile_complete=len(missing) == 0,
        missing_fields=missing
    )

def get_distributor_completeness(profile: DistributorProfile) -> schemas.ProfileCompletenessResponse:
    missing = []
    if not profile.business_name: missing.append("business_name")
    if not profile.business_category: missing.append("business_category")
    if not profile.location_id: missing.append("location")
    if not profile.service_radius: missing.append("service_radius")
    if not profile.product_categories or len(profile.product_categories) == 0: missing.append("product_categories")
    
    return schemas.ProfileCompletenessResponse(
        profile_complete=len(missing) == 0,
        missing_fields=missing
    )

def format_location(loc: Location):
    if not loc:
        return {"area": "", "block": "", "district": "", "state": "", "pin": ""}
    return {
        "area": loc.area or "",
        "block": loc.block or "",
        "district": loc.district or "",
        "state": loc.state or "",
        "pin": loc.pincode or ""
    }

def build_retailer_profile_response(user: User, profile: RetailerProfile) -> schemas.ProfileResponse:
    comp = get_retailer_completeness(profile)
    
    data = {
        "businessType": profile.business_type or "",
        "businessName": profile.business_name or "",
        "demandedCategories": profile.demanded_categories or [],
        "unmetNeeds": profile.unmet_needs or {"categories": [], "other": ""},
        "monthlyPurchaseRange": profile.monthly_sales_range or "",
        "purchasingFrequency": profile.purchase_frequency or "",
        "investmentBudget": profile.investment_budget or "",
        "requirements": profile.requirements or [],
        "existingSupplierType": profile.existing_supplier_type or "",
        "location": format_location(profile.location)
    }
    
    return schemas.ProfileResponse(
        id=profile.id,
        role=user.role,
        name=user.name,
        mobile=user.mobile,
        email=user.email,
        profile_complete=comp.profile_complete,
        missing_fields=comp.missing_fields,
        profile_data=data
    )

def build_distributor_profile_response(user: User, profile: DistributorProfile) -> schemas.ProfileResponse:
    comp = get_distributor_completeness(profile)
    
    data = {
        "businessName": profile.business_name or "",
        "businessCategory": profile.business_category or "",
        "serviceRadius": profile.service_radius or "",
        "customRadius": profile.custom_radius or "",
        "productCategories": profile.product_categories or [],
        "deliveryCapabilities": profile.delivery_capabilities or [],
        "minimumOrderRange": profile.minimum_order_range or "",
        "customMinOrder": profile.custom_min_order or "",
        "stockCapacity": profile.stock_capacity or {"level": "", "customDescription": ""},
        "retailerCoverage": profile.retailer_coverage or "",
        "location": format_location(profile.location)
    }
    
    return schemas.ProfileResponse(
        id=profile.id,
        role=user.role,
        name=user.name,
        mobile=user.mobile,
        email=user.email,
        profile_complete=comp.profile_complete,
        missing_fields=comp.missing_fields,
        profile_data=data
    )
