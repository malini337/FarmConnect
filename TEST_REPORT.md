# FarmConnect Test Report

Date: 2026-10-20

## Checks executed in this packaging environment

| Check | Result | Evidence / limitation |
|---|---|---|
| Original ZIP integrity | PASS | `ZipFile.testzip()` passed before extraction. |
| Existing backend regression tests | PASS — 14 passed, 0 failed | `node --test server/tests/*.test.js` after changes. |
| Express entry and new ML route syntax | PASS | `node --check server/server.js`; `node --check server/routes/mlRoutes.js`. |
| Synthetic training workflow | PASS | `python training/train_models.py` generated two CSV datasets and two fitted joblib artifacts. |
| Model comparison and metrics | PASS — synthetic diagnostics only | Baseline, Random Forest, and HistGradientBoosting were compared on a held-out 20% of generated rows. Metrics are not real-world performance claims. |
| FastAPI ML tests | PASS — 3 passed, 0 failed | `pytest -q` in `ml-service`. Covers health/status and invalid input rejection. |
| Artifact loading and sample inference | PASS | FastAPI TestClient returned HTTP 200 for `/health`, `/demo/price`, and `/demo/demand` with artifacts loaded. Responses included synthetic-only disclaimers. |
| Frontend ESLint/build | NOT RUN in this follow-up | Client dependency tree is absent from the extracted archive; prior archive report recorded lint pass using the included dependency tree and a build block caused by missing Linux Rolldown native binding. Run `npm install`, `npm run lint`, and `npm run build` on Windows. |
| Live Express-to-FastAPI proxy | NOT RUN | Express dependencies, live server, and MongoDB were not configured for a full HTTP integration run in this environment. Static syntax checked only. |
| MongoDB/Atlas persistence and auth integration | NOT RUN | Requires owner-provided connection configuration; no credentials supplied. |
| Gemini, SMTP, Razorpay, QR camera and browser E2E | NOT RUN | Require owner credentials, configured external services, hardware/browser interaction. |
| Real market data training | NOT DONE | No verified real market-price dataset was supplied or downloaded. Only explicitly synthetic demonstration models are included. |

## Data and safety boundaries

- Real fair-price recommendation remains based on configured dated and sourced references; empty references return insufficient data.
- Synthetic price and demand model endpoints are separated under `/api/ml/demo/*` and explicitly mark outputs `synthetic_demo_only`.
- Matching remains explainable rule-based ranking; trust remains evidence/rules-based; logistics is coordination rather than route optimization; QR traceability is not blockchain.
- If FastAPI is unavailable, the Express proxy reports `model_unavailable`; it does not manufacture a replacement prediction.
