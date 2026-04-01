"""
CivicMap hybrid recommender.

Combines:
- Content score from event embeddings
- User-based collaborative filtering score (Surprise KNNBasic)

Blend formula (normalized):
    hybrid_norm = 0.6 * content + 0.4 * collaborative

Returned score is projected back to 0.5-1.5 so it aligns with existing weight scale.
"""

from __future__ import annotations

import ast
import os
import sys
import uuid
from pathlib import Path


# Deterministic UUIDs for smoke-test seed users — must match seed_user_interactions.py.
_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

def _seed_uuid(name: str) -> str:
    return str(uuid.uuid5(_NS, f"civicmap.{name}"))

SEED_USERS = {
    "user-civic-1": _seed_uuid("user-civic-1"),
    "user-civic-2": _seed_uuid("user-civic-2"),
    "user-arts-1":  _seed_uuid("user-arts-1"),
    "user-new-1":   _seed_uuid("user-new-1"),
}

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import Client, create_client
from surprise import Dataset, KNNBasic, Reader
from surprise.trainset import Trainset


# scikit-surprise support on Windows is most reliable on Python 3.11.
if sys.version_info >= (3, 12):
    raise RuntimeError(
        "hybrid_model.py requires Python 3.11 for scikit-surprise compatibility on Windows."
    )


# Load environment variables from project root.
load_dotenv(Path(__file__).parent.parent / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
    "NEXT_PUBLIC_SUPABASE_SERVICE_KEY"
)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
encoder = SentenceTransformer("all-MiniLM-L6-v2")


# Global collaborative model cache.
_model: KNNBasic | None = None
_trainset: Trainset | None = None
_interactions_df: pd.DataFrame | None = None


def _infer_weight(weight: object, interaction_type: object) -> float:
    if weight is not None:
        return float(weight)

    type_to_weight = {
        "view": 0.5,
        "save": 1.0,
        "registered": 1.5,
        "register": 1.5,
    }
    return type_to_weight.get(str(interaction_type or "").lower(), 1.0)


def _parse_embedding(raw_embedding: object) -> np.ndarray | None:
    if raw_embedding is None:
        return None
    if isinstance(raw_embedding, list):
        return np.array(raw_embedding, dtype=np.float32)
    if isinstance(raw_embedding, str):
        try:
            return np.array(ast.literal_eval(raw_embedding), dtype=np.float32)
        except (SyntaxError, ValueError):
            return None
    return None


def _normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def _event_text(event: dict) -> str:
    parts = [
        str(event.get("title") or ""),
        str(event.get("description") or ""),
        str(event.get("categories") or ""),
    ]
    return " ".join(p for p in parts if p).strip()


def load_interactions() -> pd.DataFrame:
    response = (
        supabase.table("user_interactions")
        .select("user_id, event_id, weight, interaction_type")
        .execute()
    )

    rows = response.data or []
    if not rows:
        raise ValueError("No interaction data found in user_interactions table.")

    processed_rows = []
    for row in rows:
        processed_rows.append(
            {
                "user_id": str(row["user_id"]),
                "event_id": str(row["event_id"]),
                "weight": _infer_weight(row.get("weight"), row.get("interaction_type")),
            }
        )

    df = pd.DataFrame(processed_rows)
    return df


def build_model(df: pd.DataFrame) -> tuple[KNNBasic, Trainset]:
    reader = Reader(rating_scale=(0.5, 1.5))
    data = Dataset.load_from_df(df[["user_id", "event_id", "weight"]], reader)

    model = KNNBasic(
        k=5,
        min_k=1,
        sim_options={"name": "cosine", "user_based": True},
        verbose=False,
    )

    trainset = data.build_full_trainset()
    model.fit(trainset)
    return model, trainset


def refresh_model() -> None:
    global _model, _trainset, _interactions_df
    _interactions_df = load_interactions()
    _model, _trainset = build_model(_interactions_df)


def _ensure_model() -> None:
    if _model is None or _trainset is None or _interactions_df is None:
        refresh_model()


def get_all_events() -> list[dict]:
    response = (
        supabase.table("events")
        .select("id, title, description, categories, embedding")
        .execute()
    )
    return response.data or []


def get_user_seen_event_ids(user_id: str) -> set[str]:
    response = (
        supabase.table("user_interactions")
        .select("event_id")
        .eq("user_id", user_id)
        .execute()
    )
    return {str(row["event_id"]) for row in (response.data or [])}


def get_user_interaction_count(user_id: str) -> int:
    response = (
        supabase.table("user_interactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    if response.count is not None:
        return int(response.count)
    return len(response.data or [])


def is_cold_start_user(user_id: str, threshold: int = 3) -> bool:
    return get_user_interaction_count(user_id) < threshold


def _build_user_content_vector(user_id: str, all_events_by_id: dict[str, dict]) -> np.ndarray | None:
    response = (
        supabase.table("user_interactions")
        .select("event_id, weight, interaction_type")
        .eq("user_id", user_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        return None

    vectors: list[np.ndarray] = []
    weights: list[float] = []

    for row in rows:
        event_id = str(row["event_id"])
        event = all_events_by_id.get(event_id)
        if not event:
            continue

        emb = _parse_embedding(event.get("embedding"))
        if emb is None:
            text = _event_text(event)
            if not text:
                continue
            emb = encoder.encode(text)

        vectors.append(_normalize(np.array(emb, dtype=np.float32)))
        weights.append(_infer_weight(row.get("weight"), row.get("interaction_type")))

    if not vectors:
        return None

    stacked = np.vstack(vectors)
    w = np.array(weights, dtype=np.float32)
    w = w / max(w.sum(), 1e-8)
    user_vector = np.average(stacked, axis=0, weights=w)
    return _normalize(user_vector)


def _get_content_scores(user_id: str, candidate_events: list[dict], all_events: list[dict]) -> dict[str, float]:
    all_events_by_id = {str(e["id"]): e for e in all_events}
    user_vector = _build_user_content_vector(user_id, all_events_by_id)

    if user_vector is None:
        # No history at all: assign neutral content score.
        return {str(event["id"]): 0.5 for event in candidate_events}

    scores: dict[str, float] = {}
    for event in candidate_events:
        event_id = str(event["id"])
        emb = _parse_embedding(event.get("embedding"))
        if emb is None:
            text = _event_text(event)
            if not text:
                scores[event_id] = 0.0
                continue
            emb = encoder.encode(text)

        event_vec = _normalize(np.array(emb, dtype=np.float32))
        sim = float(cosine_similarity(user_vector.reshape(1, -1), event_vec.reshape(1, -1))[0][0])
        # Convert from cosine [-1, 1] to [0, 1] for blending.
        scores[event_id] = max(0.0, min(1.0, (sim + 1.0) / 2.0))

    return scores


def _get_collab_scores_raw(user_id: str, candidate_event_ids: list[str]) -> dict[str, float]:
    _ensure_model()
    assert _model is not None

    scores: dict[str, float] = {}
    for event_id in candidate_event_ids:
        pred = _model.predict(uid=user_id, iid=event_id)
        # Clamp to expected scale.
        scores[event_id] = max(0.5, min(1.5, float(pred.est)))
    return scores


def get_collaborative_recommendations(user_id: str, n: int = 10) -> list[dict]:
    all_events = get_all_events()
    all_ids = [str(e["id"]) for e in all_events]
    seen_ids = get_user_seen_event_ids(user_id)
    candidate_ids = [eid for eid in all_ids if eid not in seen_ids]

    if not candidate_ids:
        return []

    collab_scores = _get_collab_scores_raw(user_id, candidate_ids)
    ranked = sorted(collab_scores.items(), key=lambda kv: kv[1], reverse=True)[:n]

    return [
        {
            "event_id": int(event_id),
            "score": round(score, 3),
            "reason": "collaborative_filtering",
        }
        for event_id, score in ranked
    ]


def _pick_hybrid_weights(user_id: str, collab_available: bool) -> tuple[float, float, str]:
    _ensure_model()
    assert _interactions_df is not None

    user_interactions = get_user_interaction_count(user_id)
    global_sparse = len(_interactions_df) < 50 or _interactions_df["user_id"].nunique() < 5

    if not collab_available:
        return 1.0, 0.0, "content_only_no_collab"

    if user_interactions < 3:
        return 1.0, 0.0, "content_only_cold_start"

    if user_interactions < 8 or global_sparse:
        return 0.75, 0.25, "content_heavy_sparse_data"

    return 0.6, 0.4, "balanced_hybrid"


def get_hybrid_recommendations(user_id: str, n: int = 10) -> list[dict]:
    all_events = get_all_events()
    seen_ids = get_user_seen_event_ids(user_id)
    candidate_events = [e for e in all_events if str(e["id"]) not in seen_ids]

    if not candidate_events:
        return []

    candidate_ids = [str(e["id"]) for e in candidate_events]
    content_scores = _get_content_scores(user_id, candidate_events, all_events)

    collab_scores_raw = _get_collab_scores_raw(user_id, candidate_ids)
    collab_available = len(collab_scores_raw) > 0

    content_w, collab_w, weight_reason = _pick_hybrid_weights(user_id, collab_available)

    output = []
    for event in candidate_events:
        event_id = str(event["id"])
        content_score = float(content_scores.get(event_id, 0.0))
        collab_raw = float(collab_scores_raw.get(event_id, 1.0))
        collab_norm = max(0.0, min(1.0, collab_raw - 0.5))

        hybrid_norm = (content_w * content_score) + (collab_w * collab_norm)
        final_score = 0.5 + hybrid_norm

        output.append(
            {
                "event_id": int(event_id),
                "score": round(final_score, 3),
                "reason": "hybrid_model",
                "content_score": round(content_score, 3),
                "collab_score": round(collab_raw, 3),
                "weights": {
                    "content": content_w,
                    "collab": collab_w,
                    "mode": weight_reason,
                },
            }
        )

    output.sort(key=lambda x: x["score"], reverse=True)
    return output[:n]


def _get_event_titles(event_ids: list[int]) -> dict[int, str]:
    response = (
        supabase.table("events")
        .select("id, title")
        .in_("id", event_ids)
        .execute()
    )
    return {row["id"]: row["title"] for row in (response.data or [])}


def run_demo(n: int = 20) -> None:
    print("Training collaborative model...")
    refresh_model()
    print("Model trained.\n")

    all_recs: dict[str, list[dict]] = {}
    all_event_ids: list[int] = []

    for label, user_id in SEED_USERS.items():
        recs = get_hybrid_recommendations(user_id, n=n)
        all_recs[label] = recs
        all_event_ids.extend(r["event_id"] for r in recs)

    titles = _get_event_titles(list(set(all_event_ids)))

    for label, recs in all_recs.items():
        mode = recs[0]["weights"]["mode"] if recs else "n/a"
        print(f"{'-' * 60}")
        print(f"  {label}  [{mode}]")
        print(f"{'-' * 60}")
        for i, r in enumerate(recs, 1):
            title = titles.get(r["event_id"], f"event {r['event_id']}")
            print(f"  {i:>2}. {title:<45}  score={r['score']}")
        print()

    print("-- Overlap check " + "-" * 43)
    civic_ids = [r["event_id"] for r in all_recs["user-civic-1"]]
    arts_ids  = [r["event_id"] for r in all_recs["user-arts-1"]]
    civic2_ids = [r["event_id"] for r in all_recs["user-civic-2"]]
    print(f"  civic-1 vs civic-2 : {_overlap_ratio(civic_ids, civic2_ids):.0%}  (target ~60-80%)")
    print(f"  civic-1 vs arts-1  : {_overlap_ratio(civic_ids, arts_ids):.0%}  (target <30%)")


def _overlap_ratio(a: list[int], b: list[int]) -> float:
    if not a or not b:
        return 0.0
    sa = set(a)
    sb = set(b)
    return len(sa & sb) / max(len(sa), len(sb))


def run_smoke_tests() -> None:
    print("Training collaborative model...")
    refresh_model()
    print("Model trained successfully.")

    user_top_ids: dict[str, list[int]] = {}
    for label, user_id in SEED_USERS.items():
        recs = get_hybrid_recommendations(user_id, n=10)
        user_top_ids[label] = [r["event_id"] for r in recs]
        print(f"\nTop recommendations for {label} ({user_id}):")
        for r in recs[:5]:
            print(
                f"  event_id={r['event_id']} score={r['score']} "
                f"(content={r['content_score']}, collab={r['collab_score']}, mode={r['weights']['mode']})"
            )

    civic_overlap = _overlap_ratio(user_top_ids["user-civic-1"], user_top_ids["user-civic-2"])
    cross_overlap = _overlap_ratio(user_top_ids["user-civic-1"], user_top_ids["user-arts-1"])

    print("\nOverlap checks:")
    print(f"  civic-1 vs civic-2 overlap: {civic_overlap:.0%} (target ~60-80%)")
    print(f"  civic-1 vs arts-1 overlap:  {cross_overlap:.0%} (target <30%)")


if __name__ == "__main__":
    if "--demo" in sys.argv:
        run_demo()
    else:
        run_smoke_tests()
