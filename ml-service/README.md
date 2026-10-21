# FarmConnect ML service (classroom demonstration)

This is a separate Python/FastAPI service for two reproducible, trained scikit-learn demo models. Both models are trained **only on generated synthetic records**. Their outputs are labelled `synthetic_demo_only`; they are not market prices or observed demand. Existing fair-price recommendations continue to require dated, sourced market references, and the existing farmer-order forecast remains a separate real-record run-rate calculation.

## Windows PowerShell setup

Open Terminal 1:
```powershell
cd path\to\farmer-marketplace\ml-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python training\train_models.py
pytest -q
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Use Python 3.11 or 3.12 for widest package compatibility. The project was also exercised in the packaging environment with Python 3.13 and scikit-learn 1.8.0.

Terminal 2 (Express backend): copy `server/.env.example` to `server/.env`, set the normal MongoDB/JWT settings, and configure `ML_SERVICE_URL=http://127.0.0.1:8000`; then run:
```powershell
cd path\to\farmer-marketplace\server
npm install
npm run dev
```
Terminal 3 (React frontend):
```powershell
cd path\to\farmer-marketplace\client
npm install
npm run dev
```
Open the Vite URL, sign in, and use Feature Centre. The Fair Price panel has a clearly marked synthetic ML demonstration. The Demand Forecast panel keeps the existing actual-record run-rate and adds a separate synthetic demo. No demo prediction is substituted if the model service is down.

## API
- `GET /health` — service health and artifact load state.
- `GET /models/status` — model versions and synthetic holdout diagnostics.
- `POST /demo/price` — `{ "product":"Tomato", "category":"Vegetables", "month":10, "quantity_kg":100, "quality_grade":2 }`.
- `POST /demo/demand` — `{ "product":"Tomato", "category":"Vegetables", "month":10, "recent_monthly_quantity_kg":500 }`.

Express proxies these at `/api/ml/health`, authenticated `/api/ml/models/status`, `/api/ml/demo/price`, and `/api/ml/demo/demand`. The browser never calls FastAPI directly. Configure `ML_SERVICE_TIMEOUT_MS` (500–15000 ms) to adjust the backend timeout.

## Reproducibility and evaluation
Run `python training\train_models.py` to regenerate CSVs and `.joblib` artifacts with fixed seeds. Run `pytest -q` for service validation. Metrics are generated against held-out synthetic records and are **not real-world accuracy claims**. See `model_card.md` and `dataset_sources.md`.


### Product-specific demo models

The training script currently generates 6,000 rows per model across 30 named products. Product IDs are included as features so that two products in the same broad category can produce different synthetic demo outputs. The generated rows are fictional teaching data, not observed prices or FarmConnect demand. After changing training code or data, retrain with `python training/train_models.py` and run `pytest -q`.
