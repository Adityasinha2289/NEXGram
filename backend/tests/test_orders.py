import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from tests.conftest import TestingSessionLocal
from app.models import DistributorCatalogueItem

client = TestClient(app)

from app.api.deps import get_current_retailer, get_current_user
from app.models.profiles import RetailerProfile
from app.models.users import User

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def mock_get_current_retailer():
    db = TestingSessionLocal()
    profile = db.query(RetailerProfile).filter_by(id="ret_ramesh").first()
    db.close()
    return profile

def mock_get_current_user():
    db = TestingSessionLocal()
    user = db.query(User).filter_by(id="usr_dist_1").first() # dist_sharma
    db.close()
    return user

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_retailer] = mock_get_current_retailer
app.dependency_overrides[get_current_user] = mock_get_current_user

def test_create_valid_order(seed_data):
    ret_id = seed_data["profs"]["ret_1"].id
    dist_id = seed_data["profs"]["dist_1"].id
    
    # Sharma has cat_paneer_sharma and cat_milk_sharma
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id
    cat_milk_id = seed_data["catalogue"]["cat_milk_sharma"].id
    
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_id,
        "items": [
            {"catalogue_item_id": cat_paneer_id, "quantity": 10}, # MOQ is 5, Stock is 40
            {"catalogue_item_id": cat_milk_id, "quantity": 20}   # MOQ is 20, Stock is 100
        ],
        "notes": "Please deliver soon"
    }
    
    response = client.post("/api/orders", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["retailer_id"] == ret_id
    assert data["distributor_id"] == dist_id
    assert len(data["items"]) == 2
    assert data["status"] == "requested"
    assert data["subtotal"] > 0
    assert data["total"] == data["subtotal"]
    
    order_id = data["id"]
    
    # Verify stock has NOT been decremented yet
    db = TestingSessionLocal()
    paneer = db.query(DistributorCatalogueItem).filter_by(id=cat_paneer_id).first()
    assert paneer.available_stock == 40
    db.close()
    
    # Accept order
    res = client.patch(f"/api/orders/{order_id}/status", json={"status": "accepted"})
    assert res.status_code == 200
    
    # Verify stock IS decremented
    db = TestingSessionLocal()
    paneer = db.query(DistributorCatalogueItem).filter_by(id=cat_paneer_id).first()
    assert paneer.available_stock == 30
    db.close()

def test_create_order_invalid_moq(seed_data):
    ret_id = seed_data["profs"]["ret_1"].id
    dist_id = seed_data["profs"]["dist_1"].id
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id
    
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_id,
        "items": [
            {"catalogue_item_id": cat_paneer_id, "quantity": 2} # MOQ is 5
        ]
    }
    
    response = client.post("/api/orders", json=payload)
    assert response.status_code == 400
    assert "MOQ" in response.json()["detail"]

def test_create_order_insufficient_stock(seed_data):
    ret_id = seed_data["profs"]["ret_1"].id
    dist_id = seed_data["profs"]["dist_1"].id
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id
    
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_id,
        "items": [
            {"catalogue_item_id": cat_paneer_id, "quantity": 100} # Stock is 40
        ]
    }
    
    response = client.post("/api/orders", json=payload)
    assert response.status_code == 400
    assert "stock" in response.json()["detail"].lower()

def test_create_order_wrong_distributor(seed_data):
    ret_id = seed_data["profs"]["ret_1"].id
    dist_gupta_id = seed_data["profs"]["dist_2"].id # Using Gupta
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id # Belongs to Sharma!
    
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_gupta_id,
        "items": [
            {"catalogue_item_id": cat_paneer_id, "quantity": 10}
        ]
    }
    
    response = client.post("/api/orders", json=payload)
    assert response.status_code == 400
    assert "belong" in response.json()["detail"]

def test_order_price_snapshot(seed_data):
    ret_id = seed_data["profs"]["ret_1"].id
    dist_id = seed_data["profs"]["dist_1"].id
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id
    
    # 1. Create order
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_id,
        "items": [
            {"catalogue_item_id": cat_paneer_id, "quantity": 10} # Price is 320 -> total 3200
        ]
    }
    res = client.post("/api/orders", json=payload)
    order_data = res.json()
    assert order_data["subtotal"] == 3200.0
    
    # 2. Change catalogue price manually in DB
    db = TestingSessionLocal()
    paneer = db.query(DistributorCatalogueItem).filter_by(id=cat_paneer_id).first()
    paneer.selling_price = 400.0
    db.commit()
    db.close()
    
    # 3. Fetch order and verify it's still 320
    res2 = client.get(f"/api/orders/{order_data['id']}")
    data = res2.json()
    assert data["items"][0]["unit_price"] == 320.0
    assert data["subtotal"] == 3200.0

def test_invalid_status_transition(seed_data):
    # Need to create an order first
    ret_id = seed_data["profs"]["ret_1"].id
    dist_id = seed_data["profs"]["dist_1"].id
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id
    
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_id,
        "items": [{"catalogue_item_id": cat_paneer_id, "quantity": 10}]
    }
    res = client.post("/api/orders", json=payload)
    order_id = res.json()["id"]
    
    # Transition from "requested" to "ready" should fail
    res = client.patch(f"/api/orders/{order_id}/status", json={"status": "ready"})
    assert res.status_code == 400
    
def test_stock_rollback_on_cancel(seed_data):
    # Setup order
    ret_id = seed_data["profs"]["ret_1"].id
    dist_id = seed_data["profs"]["dist_1"].id
    cat_paneer_id = seed_data["catalogue"]["cat_paneer_sharma"].id
    
    payload = {
        "retailer_id": ret_id,
        "distributor_id": dist_id,
        "items": [{"catalogue_item_id": cat_paneer_id, "quantity": 10}]
    }
    res = client.post("/api/orders", json=payload)
    order_id = res.json()["id"]
    
    # Accept (decrements stock)
    client.patch(f"/api/orders/{order_id}/status", json={"status": "accepted"})
    
    db = TestingSessionLocal()
    paneer = db.query(DistributorCatalogueItem).filter_by(id=cat_paneer_id).first()
    assert paneer.available_stock == 30
    db.close()
    
    # Cancel (should rollback stock)
    client.patch(f"/api/orders/{order_id}/status", json={"status": "cancelled"})
    
    db = TestingSessionLocal()
    paneer = db.query(DistributorCatalogueItem).filter_by(id=cat_paneer_id).first()
    assert paneer.available_stock == 40
    db.close()
