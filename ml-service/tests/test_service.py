from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)

def test_health_and_status():
    r=client.get('/health'); assert r.status_code==200 and r.json()['status']=='success'
    assert client.get('/models/status').status_code==200

def test_price_validation():
    r=client.post('/demo/price',json={'product':'Tomato','category':'Vegetables','month':13,'quantity_kg':20,'quality_grade':2})
    assert r.status_code==422

def test_demand_validation():
    r=client.post('/demo/demand',json={'product':'Tomato','category':'Vegetables','month':1,'recent_monthly_quantity_kg':-3})
    assert r.status_code==422
