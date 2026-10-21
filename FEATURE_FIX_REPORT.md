# FarmConnect feature repair report

## Changes in this package
- Excluded explicitly `demoKey`-tagged records from smart buyer matching, open logistics groups, requirements shown to farmers, interest request lists, and notification lists. These are query filters, not database deletion.
- Centralized product categories in `client/src/constants/categories.js` and reused them for Add Product, marketplace category filters, Fair Price Recommendation, and buyer requirement categories.
- Allowed the fair-price API to accept `quintal`, matching the UI unit options.
- Added `CODE_MAP.md` and `REPAIR_NOTES.md` for project navigation and classroom explanation.
- Added a clearly labeled illustrative turmeric reference record in `server/.env.demo.example`; it is fabricated demo data, not real market evidence.

## Verification performed here
- `server`: `npm test` — 14 passed, 0 failed.
- `server`: JavaScript syntax checks performed on route and utility files.
- ZIP archive: integrity checked after creation.
- Frontend production build could not be completed in this environment because the copied `node_modules` tree lacks the platform-specific Rolldown native binding. The ZIP excludes `node_modules`, so install dependencies on Windows with `npm install` before building.
- Live browser workflows and MongoDB integration have not been verified in this environment. Do not treat them as fully proven until tested against the user's configured database.

## Honest model description
Smart Buyer Matching uses explainable rule-based scoring. Demand Forecasting uses a simple 90-day delivered-order run rate. Fair Price Recommendation uses dated, sourced configured reference records. These are useful demonstrable smart features, but not all are trained machine-learning models. QR traceability displays recorded data; it does not independently verify claims. Trust indicators do not imply independent identity or certification verification.
