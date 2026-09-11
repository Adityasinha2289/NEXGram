from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import (
    Category, Product, ProductVariant, 
    DistributorProfile, RetailerProfile, Location, User, DistributorCatalogueItem
)
import uuid

def seed_categories(db: Session):
    # Root categories
    fmcg = Category(id="cat_fmcg", name="FMCG", slug="fmcg", level=0)
    db.add(fmcg)
    db.commit()
    
    # Subcategories
    staples = Category(id="cat_staples", parent_id=fmcg.id, name="Staples", slug="staples", level=1)
    dairy = Category(id="cat_dairy", parent_id=fmcg.id, name="Dairy", slug="dairy", level=1)
    beverages = Category(id="cat_beverages", parent_id=fmcg.id, name="Beverages", slug="beverages", level=1)
    db.add_all([staples, dairy, beverages])
    db.commit()

    return {"staples": staples, "dairy": dairy, "beverages": beverages}

def seed_products_and_variants(db: Session, cats: dict):
    # Products
    paneer = Product(id="prod_paneer", category_id=cats["dairy"].id, canonical_name="Paneer", normalized_name="paneer")
    milk = Product(id="prod_milk", category_id=cats["dairy"].id, canonical_name="Milk", normalized_name="milk")
    atta = Product(id="prod_atta", category_id=cats["staples"].id, canonical_name="Atta", normalized_name="atta")
    db.add_all([paneer, milk, atta])
    db.commit()

    # Variants
    paneer_200g = ProductVariant(id="var_paneer_200g", product_id=paneer.id, variant_name="200g", pack_size="200", unit="g")
    paneer_1kg = ProductVariant(id="var_paneer_1kg", product_id=paneer.id, variant_name="1kg", pack_size="1", unit="kg")
    milk_500ml = ProductVariant(id="var_milk_500ml", product_id=milk.id, variant_name="500ml", pack_size="500", unit="ml")
    atta_5kg = ProductVariant(id="var_atta_5kg", product_id=atta.id, variant_name="5kg", pack_size="5", unit="kg")
    db.add_all([paneer_200g, paneer_1kg, milk_500ml, atta_5kg])
    db.commit()
    
    return {
        "paneer_200g": paneer_200g,
        "paneer_1kg": paneer_1kg,
        "milk_500ml": milk_500ml,
        "atta_5kg": atta_5kg
    }

def seed_users_and_profiles(db: Session):
    from app.core.security import get_password_hash
    # Location
    loc = Location(id="loc_palampur", state="Himachal Pradesh", district="Kangra", area="Palampur Market")
    db.add(loc)
    db.commit()
    
    # Users
    hashed_pw = get_password_hash("password123")
    dist_user_1 = User(id="usr_dist_1", role="distributor", name="Sharma", mobile="9999999991", password_hash=hashed_pw)
    dist_user_2 = User(id="usr_dist_2", role="distributor", name="Gupta", mobile="9999999992", password_hash=hashed_pw)
    ret_user_1 = User(id="usr_ret_1", role="retailer", name="Ramesh", mobile="8888888881", password_hash=hashed_pw)
    db.add_all([dist_user_1, dist_user_2, ret_user_1])
    db.commit()

    # Profiles
    dist_1 = DistributorProfile(id="dist_sharma", user_id=dist_user_1.id, location_id=loc.id, business_name="Sharma Distributors", verification_status="verified")
    dist_2 = DistributorProfile(id="dist_gupta", user_id=dist_user_2.id, location_id=loc.id, business_name="Gupta Rural Supplies", verification_status="verified")
    ret_1 = RetailerProfile(id="ret_ramesh", user_id=ret_user_1.id, location_id=loc.id, business_name="Ramesh Kirana")
    db.add_all([dist_1, dist_2, ret_1])
    db.commit()
    
    return {"dist_1": dist_1, "dist_2": dist_2, "ret_1": ret_1}

def seed_catalogue(db: Session, profiles: dict, variants: dict):
    # Sharma sells Paneer 1kg and Milk 500ml
    cat_1 = DistributorCatalogueItem(
        distributor_id=profiles["dist_1"].id,
        product_id=variants["paneer_1kg"].product_id,
        product_variant_id=variants["paneer_1kg"].id,
        selling_price=320.0,
        minimum_order_quantity=5,
        available_stock=40,
        stock_status="available"
    )
    cat_2 = DistributorCatalogueItem(
        distributor_id=profiles["dist_1"].id,
        product_id=variants["milk_500ml"].product_id,
        product_variant_id=variants["milk_500ml"].id,
        selling_price=25.0,
        minimum_order_quantity=20,
        available_stock=100,
        stock_status="available"
    )
    
    # Gupta also sells Paneer 1kg (cheaper but higher MOQ) and Atta 5kg
    cat_3 = DistributorCatalogueItem(
        distributor_id=profiles["dist_2"].id,
        product_id=variants["paneer_1kg"].product_id,
        product_variant_id=variants["paneer_1kg"].id,
        selling_price=315.0,
        minimum_order_quantity=10,
        available_stock=100,
        stock_status="available"
    )
    cat_4 = DistributorCatalogueItem(
        distributor_id=profiles["dist_2"].id,
        product_id=variants["atta_5kg"].product_id,
        product_variant_id=variants["atta_5kg"].id,
        selling_price=200.0,
        minimum_order_quantity=5,
        available_stock=50,
        stock_status="available"
    )
    
    db.add_all([cat_1, cat_2, cat_3, cat_4])
    db.commit()
    
    return {
        "cat_paneer_sharma": cat_1,
        "cat_milk_sharma": cat_2,
        "cat_paneer_gupta": cat_3,
        "cat_atta_gupta": cat_4
    }

def run_seed():
    from app.models import Base
    # Create tables if not using alembic for tests, or ensure alembic is run first.
    # We will assume migrations are run.
    db = SessionLocal()
    try:
        # Prevent double seeding simply by checking categories
        if db.query(Category).count() > 0:
            print("Database already seeded.")
            return

        print("Seeding database...")
        cats = seed_categories(db)
        variants = seed_products_and_variants(db, cats)
        profiles = seed_users_and_profiles(db)
        seed_catalogue(db, profiles, variants)
        print("Seed complete.")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
