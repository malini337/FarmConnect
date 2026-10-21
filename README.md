# FarmConnect — Direct Market Access & E-Commerce Platform for Farmers

FarmConnect is the existing React + Vite frontend and Express + MongoDB/Mongoose backend, with Gemini-based produce assessment, four account roles, marketplace, orders, buyer requirements, payments, and the Feature Centre. This repair keeps the existing project structure.

## Requirements

- Node.js 22 LTS recommended (Node 20.19+ should work with the included Vite major version).
- MongoDB Atlas or a compatible MongoDB instance.
- Gemini API key only for live AI produce assessment.
- SMTP credentials only if you want password-reset emails.
- Razorpay **test-mode** keys only if testing provider checkout. Mock payments are simulations and do not transfer money.

## Safe local setup (Windows PowerShell)

1. Extract the ZIP to a folder you can write to.
2. Copy `server/.env.example` to `server/.env` and fill in your own local values. Never share this file or commit it.
3. Keep `MARKET_PRICE_REFERENCE_JSON=[]` unless you have genuine dated and sourced reference prices. Demo product prices are illustrative, not live market quotes.
4. In a second copy of the environment file, keep `DEMO_MODE=false` until you intentionally want the demo account picker and seeder. For a local demonstration set `DEMO_MODE=true`. The documented demo password is for demo accounts only; change it with `DEMO_ACCOUNT_PASSWORD` before seeding if you prefer.
5. Copy `client/.env.example` to `client/.env` only if you need to change `VITE_API_BASE_URL`; its default is `http://localhost:5000`.

### Seed demonstration records

After configuring `MONGO_URI`, `JWT_SECRET`, and `DEMO_MODE=true`, run this **once or whenever you want to ensure demo records exist**:

```powershell
cd path\to\farmer-marketplace\server
npm install
npm run seed:demo
```

The seed uses stable `demoKey` values and create-only, non-destructive idempotent records. It never deletes collections or real records. If a demo email already belongs to an account without the expected demo key, the seeder aborts before creating records so it cannot accidentally reuse or overwrite a real account. Choose a different demo email or inspect the conflicting account manually. Demo product prices, buyer requirements, orders, and activity are clearly illustrative. Mock-paid demo orders are not real payments.

### Demo logins

Default demo-only password: `FarmConnectDemo!26` (unless `DEMO_ACCOUNT_PASSWORD` was changed before seeding).

| Role | Email |
|---|---|
| Farmer | `demo.farmer@farmconnect.local` |
| Consumer | `demo.consumer@farmconnect.local` |
| Retailer | `demo.retailer@farmconnect.local` |
| Wholesaler | `demo.wholesaler@farmconnect.local` |

The login page shows the demo account switcher only when the backend is explicitly configured with `DEMO_MODE=true`. It still submits credentials to the normal login endpoint and uses ordinary password hashing/JWT authentication.

## Run the app

Terminal 1 — backend:

```powershell
cd path\to\farmer-marketplace\server
npm install
npm run dev
```

Terminal 2 — frontend:

```powershell
cd path\to\farmer-marketplace\client
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The API normally listens on `http://localhost:5000`.

## Feature routes

- `/` — original home page and navigation.
- `/login`, `/register`, `/forgot-password`, `/reset-password/:token` — authentication and recovery.
- `/farmer-dashboard`, `/customer-dashboard`, `/retailer-dashboard`, `/wholesaler-dashboard` — role dashboards.
- `/products`, `/add-product`, `/my-products`, `/cart`, `/orders`, `/requirements` — marketplace and commerce.
- `/features` — fair-price recommendation, Smart Buyer Matching, Group Logistics, Demand Forecasting, Trust Layer, Requests, Notifications, and traceability entry point.
- `/trace/:token` — public traceability page; `/scan` — browser QR scanner where `BarcodeDetector` is supported.

## Price and data integrity notes

- The seed adds **30 demo products**: 10 vegetables, 8 fruits, 7 grains/pulses/spices, and 5 other agricultural products. Each has a matching local SVG illustration under `client/public/demo-products/`.
- Seed prices and activity are labelled as demo/illustrative; they are not live market intelligence or real customer activity.
- Fair-price recommendations only use matching, dated, sourced entries in `MARKET_PRICE_REFERENCE_JSON`. With the default empty list, the app honestly returns insufficient data.
- Demand Forecasting uses delivered orders in a 90-day window and a simple 30-day run-rate; it is not a validated seasonal forecast. Demo history is marked by demo account/records.
- Trust indicators report recorded profile/listing/review/order facts. Account identity and certification remain unverified unless independent evidence is integrated.
- Gemini image observations and scores do not prove food safety, authenticity, origin, certification, or actual weight. Use a weighing scale for real quantity.
- The QR encodes a non-secret traceability URL, not a token for authentication. QR image rendering uses an external QR rendering service and needs internet; the scanner uses the browser's built-in `BarcodeDetector` where available and camera permission is required.
- Razorpay is test-mode only. Demo/mock payment records are simulations; they do not move money. No real refund is claimed.

## Tests

Backend unit and demo-catalog checks:

```powershell
cd server
npm test
```

Frontend lint/build:

```powershell
cd client
npm run lint
npm run build
```

See `TEST_REPORT.md` for the checks actually run in the packaging environment and external-service limitations.
### Demo product photos
The 30 demo listings use product-specific remote photo URLs from Unsplash for real produce photography. If a remote image fails to load, the marketplace falls back to the matching bundled local SVG illustration. Re-run `npm run seed:demo` after updating to refresh the image URLs on existing FarmConnect demo products only. These are real photographs, not a live camera feed or live inventory images.


## Optional Python ML demonstration service

The project now includes `ml-service/`, a separate FastAPI service with two trained scikit-learn models. **Both are trained only on synthetic classroom data and are not real market intelligence.** They are exposed in the Feature Centre only as clearly labelled demonstrations. The existing fair-price feature continues to return insufficient data unless matching dated/sourced references are configured; the existing order-history forecast remains separate from the synthetic demo.

Follow `ml-service/README.md` for the three-terminal Windows setup. In brief, create a Python virtual environment in `ml-service`, install `requirements.txt`, run `python training/train_models.py`, run `pytest -q`, and start `uvicorn app.main:app --host 127.0.0.1 --port 8000`. Set `ML_SERVICE_URL` in `server/.env` to `http://127.0.0.1:8000`. Express proxies authenticated demo predictions at `/api/ml/demo/price` and `/api/ml/demo/demand`; it returns an explicit unavailable error rather than substituting a fake prediction if FastAPI is offline.

See `ML_IMPLEMENTATION_REPORT.md`, `ml-service/model_card.md`, and `ml-service/dataset_sources.md` for model comparisons, generated-data provenance, and limitations. ML demo metrics are synthetic holdout diagnostics only, not evidence of real-world accuracy.
