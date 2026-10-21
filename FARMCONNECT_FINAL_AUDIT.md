# FarmConnect repair audit

This audit describes the source included in this archive. Exact test evidence and unverified integrations are recorded in `TEST_REPORT.md`.

## Changes in this delivery

- Added missing Express Feature Centre handlers for fair-price recommendation, buyer matching, group logistics, demand forecast, trust indicators, interest requests, notifications, and reviews.
- Added JSON responses for unknown `/api` routes and safe handling of non-JSON responses in the Feature Centre, marketplace, traceability page, and demo-account picker.
- Added a server-gated demo account switcher. It is available only with `DEMO_MODE=true` and still uses the existing password/JWT login path.
- Added an idempotent demo seeder with four demo roles, 30 distinct products, dated/illustrative sample workflow records, and stable `demoKey` identifiers. It refuses to overwrite or reuse conflicting existing demo-email accounts.
- Added 30 local product-specific SVG illustrations. Demo product prices and associated sample activity are explicitly labelled as illustrative.
- Added a fair-price UI panel backed by configured dated/sourced reference prices, with an insufficient-data fallback when references are absent.
- Added browser QR scanning at `/scan` where the browser supports `BarcodeDetector`, and clearer traceability status labels. QR images currently use an external QR rendering endpoint.
- Tightened product quantity/price/name/description/unit validation and expanded supported units for quintal listings.
- Preserved the existing React/Vite, Express, Mongoose, authentication, commerce, order and payment architecture.

## Not claimed as verified

- MongoDB Atlas writes and API visibility, authentication/authorization integration, Gemini, SMTP, Razorpay, physical camera scanning, and browser end-to-end flows were not run without configured services.
- The production frontend build could not run in this Linux packaging environment because the uploaded dependency tree lacks the Linux Rolldown native binding. Frontend ESLint and backend automated tests did run; see `TEST_REPORT.md`.
