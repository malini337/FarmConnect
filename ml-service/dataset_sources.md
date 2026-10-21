# Dataset sources and provenance

No external dataset is used in this initial ML demonstration. `data/synthetic/synthetic_price_training.csv` and `data/synthetic/synthetic_demand_training.csv` are generated deterministically by `training/train_models.py` using NumPy seed values 20261020 and 20261021. They are synthetic, have no external license or geographic coverage, and do not represent actual agricultural market prices or FarmConnect transactions. Generation date is recorded by each training run in the saved model artifact's `trained_at` metadata. Do not cite these files as real-world evidence.

To enable production price recommendations, add an independently verified dataset and document provider/source URL, retrieval date, license, geographic scope, date range, currency, unit normalization, and data quality. Keep real-data training separate from these demonstration artifacts.
