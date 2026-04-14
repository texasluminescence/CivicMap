"""
CivicMap — Offline recommendation pre-compute script
ml/push_recommendations.py

Runs the hybrid model for every active user and upserts results to the
`recommendations` table in Supabase. The Next.js API then reads from that
table instead of spawning Python on every request.

Usage:
    python ml/push_recommendations.py [--n 20]

Options:
    --n N      Number of recommendations per user (default: 20)
    --users    Comma-separated list of user IDs to process (default: all users
               who have at least one interaction)

Typical workflow:
    1. Add interactions (users browse/save/register events)
    2. Retrain model: python ml/retrain_model.py
    3. Push recommendations: python ml/push_recommendations.py
    4. Recommendations are now live in Supabase — no Python needed at request time
"""
from __future__ import annotations

import argparse
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

ML_DIR = Path(__file__).parent
MODEL_PATH = ML_DIR / "model" / "collab_model.pkl"

sys.path.insert(0, str(ML_DIR))

import hybrid_model  # noqa: E402


def load_model() -> None:
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            saved = pickle.load(f)
        hybrid_model._model = saved["model"]
        hybrid_model._trainset = saved["trainset"]
        hybrid_model._interactions_df = saved["interactions_df"]
        print(f"Loaded cached model from {MODEL_PATH}")
    else:
        print("No cached model — training from scratch...")
        hybrid_model.refresh_model()


def get_all_user_ids() -> list[str]:
    """Fetch distinct user IDs from user_interactions table."""
    response = (
        hybrid_model.supabase.table("user_interactions")
        .select("user_id")
        .execute()
    )
    rows = response.data or []
    seen: set[str] = set()
    user_ids: list[str] = []
    for row in rows:
        uid = str(row["user_id"])
        if uid not in seen:
            seen.add(uid)
            user_ids.append(uid)
    return user_ids


def push_recommendations(user_ids: list[str], n: int) -> None:
    now = datetime.now(timezone.utc).isoformat()
    upserted = 0
    failed = 0

    for i, user_id in enumerate(user_ids, 1):
        print(f"[{i}/{len(user_ids)}] {user_id[:8]}...", end=" ", flush=True)
        try:
            recs = hybrid_model.get_hybrid_recommendations(user_id, n=n)
        except Exception as exc:
            print(f"SKIP ({exc})")
            failed += 1
            continue

        if not recs:
            print("no recs")
            continue

        row = {
            "user_id": user_id,
            "recommendations": recs,   # stored as JSONB array
            "updated_at": now,
        }

        hybrid_model.supabase.table("recommendations").upsert(
            row, on_conflict="user_id"
        ).execute()

        print(f"OK ({len(recs)} recs)")
        upserted += 1

    print(f"\nDone — {upserted} users updated, {failed} failed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Push recommendations to Supabase")
    parser.add_argument("--n", type=int, default=20, help="Recs per user")
    parser.add_argument(
        "--users",
        type=str,
        default=None,
        help="Comma-separated user IDs (default: all users with interactions)",
    )
    args = parser.parse_args()

    load_model()

    if args.users:
        user_ids = [u.strip() for u in args.users.split(",") if u.strip()]
    else:
        print("Fetching all users with interactions...")
        user_ids = get_all_user_ids()
        print(f"Found {len(user_ids)} users.")

    if not user_ids:
        print("No users found — nothing to do.")
        return

    push_recommendations(user_ids, n=args.n)


if __name__ == "__main__":
    main()
