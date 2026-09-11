import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models import Category
import os

# Use file-based sqlite for tests to avoid thread connection issues
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def seed_data(db):
    from seed.initial_seed import seed_categories, seed_products_and_variants, seed_users_and_profiles, seed_catalogue
    cats = seed_categories(db)
    vars = seed_products_and_variants(db, cats)
    profs = seed_users_and_profiles(db)
    cat_items = seed_catalogue(db, profs, vars)
    return {"cats": cats, "vars": vars, "profs": profs, "catalogue": cat_items}
