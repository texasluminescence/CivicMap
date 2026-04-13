"""
CivicMap — Recommendations CLI bridge
ml/get_recommendations.py

Called by the Next.js API route as a subprocess.
Loads a pre-trained model from disk if available (fast path),
otherwise falls back to a full retrain from Supabase.

Usage:
    python ml/get_recommendations.py <user_id> [n]

Output: JSON array of recommendation objects to stdout.
"""
from __future__ import annotations

import json
import pickle
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "model"
MODEL_PATH = MODEL_DIR / "collab_model.pkl"


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "user_id argument required"}), flush=True)
        sys.exit(1)

    user_id = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    # Import here so env vars are loaded before module-level supabase init.
    import hybrid_model  # noqa: PLC0415

    # Fast path: load pre-trained collaborative model from disk.
    if MODEL_PATH.exists():
        try:
            with open(MODEL_PATH, "rb") as f:
                saved = pickle.load(f)
            hybrid_model._model = saved["model"]
            hybrid_model._trainset = saved["trainset"]
            hybrid_model._interactions_df = saved["interactions_df"]
        except Exception:
            # Corrupted pickle — fall back to live retrain.
            hybrid_model.refresh_model()
    else:
        # No saved model yet; train from scratch (slow, ~30s first run).
        hybrid_model.refresh_model()

    recommendations = hybrid_model.get_hybrid_recommendations(user_id, n=n)
    print(json.dumps(recommendations), flush=True)


if __name__ == "__main__":
    main()
