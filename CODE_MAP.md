# FarmConnect code map

## Main stack
- `client/`: React + Vite frontend.
- `server/server.js`: Express application entry point and API route mounting.
- `server/models/`: MongoDB/Mongoose schemas.
- `server/routes/`: API endpoints and access rules.
- `server/utils/`: price calculation, text matching, workflow rules, and verification scoring.
- `server/tests/`: Node test-runner regression tests.

## Six smart features in the review architecture
1. **Fair Price Recommendation** — `client/src/pages/FeatureHub.jsx`; `server/routes/featureRoutes.js` (`POST /price-recommendation`); `server/utils/pricing.js`. Only returns a range when configured data matches product, category, unit, location, source, and date.
2. **Smart Buyer Matching** — `client/src/pages/FeatureHub.jsx`; `server/routes/featureRoutes.js` (`GET /matches`); `server/utils/textMatching.js`. Explainable rule-based match scoring, not a trained ML ranking model.
3. **Demand Forecasting** — `server/routes/featureRoutes.js` (`GET /forecast`). A simple 90-day delivered-order run rate; it is not a validated seasonal forecasting model.
4. **Trust Layer** — `server/routes/featureRoutes.js` (`GET /trust/:userId`); `server/models/Review.js`. Displays account/order/review indicators and explicitly labels unverified identity/certifications.
5. **QR Traceability** — `client/src/pages/FeatureHub.jsx`; `server/routes/featureRoutes.js` (`GET /trace/:token`); product traceability fields in `server/models/Product.js`.
6. **Group Logistics** — `client/src/pages/FeatureHub.jsx`; `server/routes/featureRoutes.js` (`/logistics`); `server/models/LogisticsGroup.js`. Coordinates participants; does not book a real carrier.

## Other workflow pages
- Product creation and price metadata: `client/src/pages/AddProduct.jsx`, `server/routes/productRoutes.js`.
- Marketplace and category filtering: `client/src/pages/Products.jsx`.
- Buyer requirements and commerce workflows: `client/src/pages/CommercePage.jsx`, `server/routes/commerceRoutes.js`, `server/models/Requirement.js`.
- Requests/notifications: `server/routes/featureRoutes.js`, `server/models/InterestRequest.js`, `server/models/Notification.js`.

## Demo data behavior
Feature list endpoints exclude records explicitly tagged with `demoKey`. This does not delete database records. Demo product catalog entries may still be intentionally available in marketplace areas and are visibly labeled as demo listings.

## Python ML demo service (added)
- `ml-service/app/main.py`: FastAPI health/model-status and trained model inference routes.
- `ml-service/app/schemas.py`: typed request validation.
- `ml-service/training/train_models.py`: fixed-seed synthetic data generation, baseline comparison, metrics, and artifact saving.
- `ml-service/models/`: versioned price and demand demonstration model artifacts.
- `ml-service/data/synthetic/`: generated data only; not real market or order records.
- `ml-service/tests/`: API validation and health tests.
- `server/routes/mlRoutes.js`: Express-side validation and timeout-aware proxy at `/api/ml/*`; all inference routes except health require authentication.
- `client/src/pages/FeatureHub.jsx`: clearly labelled synthetic price and demand demo actions. The existing real-record price reference and delivered-order run-rate workflows remain distinct.
- `ML_IMPLEMENTATION_REPORT.md`: methods, model diagnostics, architecture and outstanding validation.
