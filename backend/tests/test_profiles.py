from fastapi.testclient import TestClient
from fastapi import Depends
from app.main import app
from app.api.deps import get_current_user, get_current_retailer, get_current_distributor
from app.core.database import get_db
from tests.conftest import TestingSessionLocal
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile
from sqlalchemy.orm import Session

client = TestClient(app)

def test_retailer_profile_get(seed_data):
    # Set overrides using the request's db session
    app.dependency_overrides[get_current_user] = lambda db=Depends(get_db): db.query(User).filter_by(id="usr_ret_1").first()
    app.dependency_overrides[get_current_retailer] = lambda db=Depends(get_db): db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    
    res = client.get("/api/profiles/retailer/me")
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "retailer"
    assert data["profile_data"]["businessName"] == "Ramesh Kirana"
    
def test_retailer_profile_patch(seed_data):
    app.dependency_overrides[get_current_user] = lambda db=Depends(get_db): db.query(User).filter_by(id="usr_ret_1").first()
    app.dependency_overrides[get_current_retailer] = lambda db=Depends(get_db): db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    
    payload = {
        "demanded_categories": ["dairy", "snacks"],
        "unmet_needs": {"categories": ["beverages"], "other": "Cold drinks required"}
    }
    
    res = client.patch("/api/profiles/retailer/me", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "dairy" in data["profile_data"]["demandedCategories"]
    assert data["profile_data"]["unmetNeeds"]["categories"] == ["beverages"]

def test_distributor_profile_get(seed_data):
    app.dependency_overrides[get_current_user] = lambda db=Depends(get_db): db.query(User).filter_by(id="usr_dist_1").first()
    app.dependency_overrides[get_current_distributor] = lambda db=Depends(get_db): db.query(DistributorProfile).filter_by(id="dist_sharma").first()
    
    res = client.get("/api/profiles/distributor/me")
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "distributor"
    assert data["profile_data"]["businessName"] == "Sharma Distributors"

def test_distributor_profile_patch(seed_data):
    app.dependency_overrides[get_current_user] = lambda db=Depends(get_db): db.query(User).filter_by(id="usr_dist_1").first()
    app.dependency_overrides[get_current_distributor] = lambda db=Depends(get_db): db.query(DistributorProfile).filter_by(id="dist_sharma").first()
    
    payload = {
        "stock_capacity": {"level": "high", "customDescription": "Large warehouse"},
        "service_radius": "50km"
    }
    
    res = client.patch("/api/profiles/distributor/me", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["profile_data"]["stockCapacity"]["level"] == "high"
    assert data["profile_data"]["serviceRadius"] == "50km"

def test_cross_role_protection(seed_data):
    # A retailer trying to access distributor profile
    app.dependency_overrides[get_current_user] = lambda db=Depends(get_db): db.query(User).filter_by(id="usr_ret_1").first()
    # We remove the dist override to let the real dependency fail it
    if get_current_distributor in app.dependency_overrides:
        del app.dependency_overrides[get_current_distributor]
    
    res = client.get("/api/profiles/distributor/me")
    assert res.status_code == 403
    assert "Not enough permissions" in res.json()["detail"]
