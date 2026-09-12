from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from tests.conftest import TestingSessionLocal
import pytest

client = TestClient(app)


def test_get_categories(seed_data):
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4 # FMCG, Staples, Dairy, Beverages

def test_get_products(seed_data):
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 3 # Paneer, Milk, Atta
    
    # Search
    response = client.get("/api/products?search=pan")
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["canonical_name"] == "Paneer"

def test_get_distributors(seed_data):
    response = client.get("/api/distributors")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2 # Sharma, Gupta
    
    # Search
    response = client.get("/api/distributors?search=sharma")
    data = response.json()
    assert len(data["items"]) == 1

def test_get_distributor_catalogue(seed_data):
    dist_id = seed_data["profs"]["dist_1"].id
    response = client.get(f"/api/distributors/{dist_id}/catalogue")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    
    # Flat structure check
    item = data["items"][0]
    assert "product_name" in item
    assert "variant_name" in item
    assert "selling_price" in item

def test_pagination_bounds(seed_data):
    response = client.get("/api/products?page=0") # Invalid page
    assert response.status_code == 422
    
    response = client.get("/api/products?page_size=1000") # Exceeds max 100
    assert response.status_code == 422
