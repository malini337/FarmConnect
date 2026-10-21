"""Reproducible synthetic classroom models. Never use as market evidence."""
from pathlib import Path
from datetime import datetime, timezone
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "synthetic"
MODELS = ROOT / "models"
SEED = 20261020
# Thirty canonical products represented in the synthetic classroom catalogue.
PRODUCTS = [("Tomato",0,28),("Potato",0,24),("Red Onion",0,32),("Carrot",0,38),("Spinach",0,26),("Green Chilli",0,48),("Brinjal",0,30),("Ladies Finger",0,36),("Cabbage",0,22),("Cauliflower",0,34),("Mango",1,62),("Banana",1,38),("Papaya",1,34),("Guava",1,46),("Grapes",1,88),("Apple",1,120),("Orange",1,54),("Watermelon",1,24),("Pear",1,92),("Coconut",1,42),("Paddy Rice",2,34),("Wheat",2,31),("Pearl Millet",2,39),("Chickpea",3,78),("Toor Dal",3,112),("Turmeric",4,145),("Black Pepper",4,380),("Ginger",4,96),("Groundnut",5,82),("Jasmine Flower",5,180)]
PRODUCT_TO_ID = {name.lower(): i for i,(name,_,_) in enumerate(PRODUCTS)}

def metrics(y, p):
    return {"mae":round(float(mean_absolute_error(y,p)),4),"rmse":round(float(np.sqrt(mean_squared_error(y,p))),4),"r2":round(float(r2_score(y,p)),4)}

def build_price():
    rng=np.random.default_rng(SEED); n=6000
    product_id=rng.integers(0,len(PRODUCTS),n); cat=np.array([PRODUCTS[i][1] for i in product_id]); base=np.array([PRODUCTS[i][2] for i in product_id],dtype=float)
    month=rng.integers(1,13,n); qty=rng.uniform(1,1000,n); grade=rng.integers(1,4,n)
    seasonal=1+0.22*np.sin((month-1)*2*np.pi/12 + cat*0.37)
    price=base*seasonal*(1.18-0.13*(grade-1))+0.015*np.sqrt(qty)+rng.normal(0,np.maximum(1.5,base*.055),n)
    df=pd.DataFrame({"product_id":product_id,"category_id":cat,"month":month,"quantity_kg":qty,"quality_grade":grade,"price_inr_per_kg":np.maximum(1,price)})
    df.to_csv(DATA/"synthetic_price_training.csv",index=False)
    # Ordered holdout by generated row order; this is a demo, not time-valid market evaluation.
    cut=int(n*.8); X=df[["product_id","category_id","month","quantity_kg","quality_grade"]].to_numpy(); y=df.price_inr_per_kg.to_numpy()
    candidates={"dummy_mean":DummyRegressor(strategy="mean"),"random_forest":RandomForestRegressor(n_estimators=120,min_samples_leaf=3,random_state=SEED,n_jobs=1),"hist_gradient_boosting":HistGradientBoostingRegressor(max_iter=120,random_state=SEED)}
    results={}; fitted={}
    for name,m in candidates.items():
        m.fit(X[:cut],y[:cut]); results[name]=metrics(y[cut:],m.predict(X[cut:])); fitted[name]=m
    best=min(results,key=lambda k:results[k]["mae"])
    artifact={"model":fitted[best],"model_type":best,"model_version":"synthetic-price-demo-2.0.0","dataset_type":"synthetic","product_to_id":PRODUCT_TO_ID,"products":[x[0] for x in PRODUCTS],"trained_at":datetime.now(timezone.utc).isoformat(),"metrics":{"selected_model":results[best],"baseline":results["dummy_mean"],"comparison":results,"holdout":"last 20% of generated rows; synthetic only"}}
    joblib.dump(artifact,MODELS/"price_demo.joblib")
    return artifact

def build_demand():
    rng=np.random.default_rng(SEED+1); n=6000
    product_id=rng.integers(0,len(PRODUCTS),n); cat=np.array([PRODUCTS[i][1] for i in product_id]); base=np.array([PRODUCTS[i][2] for i in product_id],dtype=float)
    month=rng.integers(1,13,n); recent=rng.uniform(0,5000,n)
    season=1+0.18*np.sin((month-1)*2*np.pi/12+cat*.31); factor=0.82+(base/380)*0.16
    demand=np.maximum(0,recent*(factor*season)+np.array([1.0,1.1,.9,.75,.65,.8])[cat]*100+rng.normal(0,100+base*.25,n))
    df=pd.DataFrame({"product_id":product_id,"category_id":cat,"month":month,"recent_monthly_quantity_kg":recent,"estimated_next_month_quantity_kg":demand})
    df.to_csv(DATA/"synthetic_demand_training.csv",index=False)
    cut=int(n*.8); X=df[["product_id","category_id","month","recent_monthly_quantity_kg"]].to_numpy(); y=df.estimated_next_month_quantity_kg.to_numpy()
    candidates={"dummy_mean":DummyRegressor(strategy="mean"),"random_forest":RandomForestRegressor(n_estimators=120,min_samples_leaf=3,random_state=SEED+1,n_jobs=1),"hist_gradient_boosting":HistGradientBoostingRegressor(max_iter=120,random_state=SEED+1)}
    results={}; fitted={}
    for name,m in candidates.items():
        m.fit(X[:cut],y[:cut]); results[name]=metrics(y[cut:],m.predict(X[cut:])); fitted[name]=m
    best=min(results,key=lambda k:results[k]["mae"])
    artifact={"model":fitted[best],"model_type":best,"model_version":"synthetic-demand-demo-2.0.0","dataset_type":"synthetic","product_to_id":PRODUCT_TO_ID,"products":[x[0] for x in PRODUCTS],"trained_at":datetime.now(timezone.utc).isoformat(),"metrics":{"selected_model":results[best],"baseline":results["dummy_mean"],"comparison":results,"holdout":"last 20% of generated rows; synthetic only"}}
    joblib.dump(artifact,MODELS/"demand_demo.joblib")
    return artifact

if __name__=="__main__":
    DATA.mkdir(parents=True,exist_ok=True); MODELS.mkdir(parents=True,exist_ok=True)
    for name,artifact in [("price",build_price()),("demand",build_demand())]:
        print(json.dumps({"model":name,"model_type":artifact["model_type"],"metrics":artifact["metrics"]},indent=2))
