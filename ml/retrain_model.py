"""
CivicMap — Collaborative Filtering Retraining Script
ml/retrain_model.py

Run this script to:
  1. Fetch fresh interaction data from the user_interactions table in Supabase
  2. Rebuild the collaborative filtering KNN model
  3. Save the trained model to ml/model/collab_model.pkl
  4. Record training metadata (timestamp, row counts) to ml/model/model_metadata.json

Usage:
    python ml/retrain_model.py

Schedule this to run nightly (or whenever you want to incorporate new interactions).
The API route's get_recommendations.py will automatically pick up the new model on
its next invocation.
"""
from __future__ import annotations

import json
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

# Resolve paths relative to this file so the script works from any cwd.
ML_DIR = Path(__file__).parent
MODEL_DIR = ML_DIR / "model"
MODEL_PATH = MODEL_DIR / "collab_model.pkl"
METADATA_PATH = MODEL_DIR / "model_metadata.json"


def retrain() -> None:
    # Import after path setup so dotenv in collaborative_filtering loads correctly.
    from collaborative_filtering import build_model, load_interactions  # noqa: PLC0415

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # ── Step 1: Fetch fresh data ──────────────────────────────────────────────
    print("Fetching interaction data from Supabase...")
    df = load_interactions()
    n_interactions = len(df)
    n_users = df["user_id"].nunique()
    n_events = df["event_id"].nunique()
    print(
        f"  {n_interactions} interactions | {n_users} users | {n_events} events"
    )

    if n_interactions < 10:
        print(
            "WARNING: Fewer than 10 interactions — recommendations will be unreliable.\n"
            "         Run seed_user_interactions.py first to populate test data."
        )

    # ── Step 2: Train model ───────────────────────────────────────────────────
    print("\nTraining KNN collaborative filtering model...")
    model, trainset = build_model(df)

    # ── Step 3: Save model to disk ────────────────────────────────────────────
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(
            {"model": model, "trainset": trainset, "interactions_df": df},
            f,
            protocol=pickle.HIGHEST_PROTOCOL,
        )
    print(f"  Model saved → {MODEL_PATH}")

    # ── Step 4: Write metadata ────────────────────────────────────────────────
    trained_at = datetime.now(timezone.utc).isoformat()
    metadata: dict = {
        "last_trained_at": trained_at,
        "n_interactions": n_interactions,
        "n_users": n_users,
        "n_events": n_events,
        "model_path": str(MODEL_PATH),
    }

    # Preserve training history (last 20 entries).
    history: list[dict] = []
    if METADATA_PATH.exists():
        try:
            existing = json.loads(METADATA_PATH.read_text())
            history = existing.get("training_history", [])
        except (json.JSONDecodeError, KeyError):
            pass

    history.append(
        {
            "trained_at": trained_at,
            "n_interactions": n_interactions,
            "n_users": n_users,
            "n_events": n_events,
        }
    )
    metadata["training_history"] = history[-20:]  # Keep last 20 runs.

    METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    print(f"  Metadata saved → {METADATA_PATH}")

    print(f"\nLast trained at: {trained_at}")
    print("Retraining complete.")


if __name__ == "__main__":
    # Allow running from project root or ml/ directory.
    sys.path.insert(0, str(ML_DIR))
    retrain()
