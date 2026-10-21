# Repair notes

- Shared category vocabulary is in `client/src/constants/categories.js` and is used by Add Product, marketplace category options, Fair Price Recommendation, and buyer requirement forms.
- Feature list queries exclude records with a `demoKey`, so explicitly seeded feature records do not appear as live activity. This is filtering, not database deletion.
- Fair-price demo fixture is in `server/.env.demo.example`. Values are fabricated classroom examples and clearly labelled as such; do not claim they are live market quotes. Copy its line into `server/.env` only for a local classroom demo.
- The current matching and demand forecast algorithms are explainable rule-based calculations, not trained machine-learning models. The architecture diagram's AI/ML service can be described as a service layer, but do not claim that every feature is a trained ML model.
