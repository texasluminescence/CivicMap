"""
CivicMap - KNN Collaborative Filtering Model
ml/collaborative_filtering.py
 
User-based KNN collaborative filtering using the Surprise library.
Trained on user_interactions table data from Supabase.
"""
import os
from dotenv import load_dotenv 
import pandas as pd
from supabase import create_client, Client
from surprise import KNNBasic, Dataset, Reader
from surprise.trainset import Trainset
 

 
# ── Supabase client ────────────────────────────────────────────────────────────
 
load_dotenv(Path(__file__).parent.parent / ".env.local")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY") 

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Missing SUPABASE_URL or SUPABASE_KEY environment variables. "
        "Make sure your .env file is present and loaded."
    )
 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
 
# ── Global model state (loaded once, reused per request) ───────────────────────
 
_model: KNNBasic | None = None
_trainset: Trainset | None = None
 
 
# ── Step 1: Load interaction data ─────────────────────────────────────────────
 
def load_interactions() -> pd.DataFrame:
    """
    Fetch all rows from user_interactions and return as a DataFrame
    with columns: user_id, event_id, weight.
 
    Weight scale in the DB:
        view       → 0.5
        save       → 1.0
        register   → 1.5
    """
    response = (
        supabase.table("user_interactions")
        .select("user_id, event_id, weight")
        .execute()
    )
 
    rows = response.data
    if not rows:
        raise ValueError("No interaction data found in user_interactions table.")
 
    df = pd.DataFrame(rows, columns=["user_id", "event_id", "weight"])
 
    # Coerce types
    df["event_id"] = df["event_id"].astype(str)
    df["user_id"]  = df["user_id"].astype(str)
    df["weight"]   = df["weight"].astype(float)
 
    n_users = df["user_id"].nunique()
    print(f"Loaded {len(df)} interactions from {n_users} users")
 
    if len(df) < 10:
        print("WARNING: Very few interactions — recommendations may be unreliable.")
 
    return df
 
 
# ── Step 2: Build & train KNN model ───────────────────────────────────────────
 
def build_model(df: pd.DataFrame) -> tuple[KNNBasic, Trainset]:
    """
    Train a user-based KNN collaborative filtering model.
 
    Config:
        - algorithm  : KNNBasic (Surprise)
        - user_based : True  (similarity between users, not items)
        - similarity : cosine
        - k          : 5 nearest neighbours
        - min_k      : 1 (always return something, even for sparse users)
        - rating scale: 0.5 – 1.5 (matches our weight values)
    """
    # Surprise expects (user, item, rating) with a defined scale
    reader = Reader(rating_scale=(0.5, 1.5))
    data   = Dataset.load_from_df(df[["user_id", "event_id", "weight"]], reader)
 
    sim_options = {
        "name":        "cosine",
        "user_based":  True,   # user-based CF (not item-based)
    }
 
    model = KNNBasic(
        k=5,
        min_k=1,           # always produce predictions, even with few neighbours
        sim_options=sim_options,
        verbose=False,
    )
 
    # Train on the full dataset (no hold-out for production)
    trainset = data.build_full_trainset()
    model.fit(trainset)
 
    print("KNN model trained successfully.")
    return model, trainset
 
 
# ── Step 3: Generate recommendations ──────────────────────────────────────────
 
def get_collaborative_recommendations(user_id: str, n: int = 10) -> list[dict]:
    """
    Return the top-N event recommendations for a given user.
 
    Args:
        user_id : Supabase auth user UUID string.
        n       : Number of recommendations to return (default 10).
 
    Returns:
        List of dicts, each with keys:
            event_id  – int
            score     – float in [0.5, 1.5]
            reason    – "collaborative_filtering"
 
    Example:
        [
            {"event_id": 44, "score": 0.923, "reason": "collaborative_filtering"},
            {"event_id": 27, "score": 0.891, "reason": "collaborative_filtering"},
            ...
        ]
    """
    global _model, _trainset
 
    # Lazy-load model on first call
    if _model is None or _trainset is None:
        df = load_interactions()
        _model, _trainset = build_model(df)
 
    model    = _model
    trainset = _trainset
 
    # 1. Fetch all event IDs from the DB
    events_resp = supabase.table("events").select("id").execute()
    all_event_ids = {str(row["id"]) for row in events_resp.data}
 
    # 2. Get events this user has already interacted with (exclude from results)
    interactions_resp = (
        supabase.table("user_interactions")
        .select("event_id")
        .eq("user_id", user_id)
        .execute()
    )
    seen_event_ids = {str(row["event_id"]) for row in interactions_resp.data}
 
    candidate_event_ids = all_event_ids - seen_event_ids
 
    if not candidate_event_ids:
        print(f"User {user_id} has interacted with all events — nothing left to recommend.")
        return []
 
    # 3. Predict scores for every unseen event
    predictions = []
    for event_id in candidate_event_ids:
        # Surprise uses internal integer IDs; unknown users/items fall back to
        # global mean, so the model never hard-crashes on cold-start users.
        pred = model.predict(uid=user_id, iid=event_id)
        predictions.append((event_id, pred.est))
 
    # 4. Sort by predicted rating descending
    predictions.sort(key=lambda x: x[1], reverse=True)
 
    # 5. Return top-N formatted results
    recommendations = [
        {
            "event_id": int(eid),
            "score":    round(score, 4),
            "reason":   "collaborative_filtering",
        }
        for eid, score in predictions[:n]
    ]
 
    return recommendations
 
 
# ── Step 4: Edge-case helpers ──────────────────────────────────────────────────
 
def is_cold_start_user(user_id: str, threshold: int = 3) -> bool:
    """
    Returns True if the user has fewer than `threshold` interactions.
    The hybrid recommender (post-spring-break) uses this to decide whether
    to blend in content-based scores.
    """
    resp = (
        supabase.table("user_interactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    count = resp.count if resp.count is not None else len(resp.data)
    return count < threshold
 
 
# ── Model warm-up / cache refresh ─────────────────────────────────────────────
 
def refresh_model() -> None:
    """
    Force a full retrain from the latest interaction data.
    Call this periodically (e.g. nightly cron) so the model
    reflects new registrations and saves.
    """
    global _model, _trainset
    df = load_interactions()
    _model, _trainset = build_model(df)
    print("Model refreshed from latest interaction data.")
 
 
# ── CLI test runner ────────────────────────────────────────────────────────────
 
if __name__ == "__main__":
    print("=" * 60)
    print("CivicMap — KNN Collaborative Filtering Tests")
    print("=" * 60)
 
    # ── Load data & train once ──────────────────────────────────────
    df = load_interactions()
    model, trainset = build_model(df)
 
    # Cache for get_collaborative_recommendations()
    _model    = model
    _trainset = trainset
 
    # ── Test 1: Similar users get similar recommendations ───────────
    print("\n[Test 1] Similar users (civic-1 vs civic-2)")
    recs_civic1 = get_collaborative_recommendations("user-civic-1", n=10)
    recs_civic2 = get_collaborative_recommendations("user-civic-2", n=10)
 
    ids_civic1 = {r["event_id"] for r in recs_civic1}
    ids_civic2 = {r["event_id"] for r in recs_civic2}
 
    if ids_civic1 and ids_civic2:
        overlap = len(ids_civic1 & ids_civic2) / max(len(ids_civic1), len(ids_civic2))
        print(f"  civic-1 top recs : {sorted(ids_civic1)}")
        print(f"  civic-2 top recs : {sorted(ids_civic2)}")
        print(f"  Overlap          : {overlap:.0%}  (expect 60–80%)")
        status = "✅ PASS" if overlap >= 0.60 else "⚠️  LOW — check seed data"
        print(f"  Result           : {status}")
    else:
        print("  ⚠️  No recommendations returned — check user IDs in DB.")
 
    # ── Test 2: Different users get different recommendations ────────
    print("\n[Test 2] Different users (civic-1 vs arts-1)")
    recs_arts1 = get_collaborative_recommendations("user-arts-1", n=10)
 
    ids_arts1 = {r["event_id"] for r in recs_arts1}
 
    if ids_civic1 and ids_arts1:
        overlap2 = len(ids_civic1 & ids_arts1) / max(len(ids_civic1), len(ids_arts1))
        print(f"  civic-1 top recs : {sorted(ids_civic1)}")
        print(f"  arts-1 top recs  : {sorted(ids_arts1)}")
        print(f"  Overlap          : {overlap2:.0%}  (expect <30%)")
        status2 = "✅ PASS" if overlap2 <= 0.30 else "⚠️  HIGH — interests may be too similar in seed data"
        print(f"  Result           : {status2}")
    else:
        print("  ⚠️  No recommendations returned — check user IDs in DB.")
 
    # ── Test 3: Registrations weigh more ────────────────────────────
    print("\n[Test 3] Registrations outrank saves for civic-1")
    full_recs = get_collaborative_recommendations("user-civic-1", n=50)
    print(f"  Top 5 for civic-1:")
    for r in full_recs[:5]:
        print(f"    event_id={r['event_id']}  score={r['score']}")
    print("  (Verify manually: events civic-2 registered for should appear near top)")
 
    # ── Test 4: Cold start user ──────────────────────────────────────
    print("\n[Test 4] Cold start user (user-new-1, only 2 views)")
    try:
        recs_new = get_collaborative_recommendations("user-new-1", n=10)
        print(f"  Returned {len(recs_new)} recommendations — model did not crash. ✅")
        if recs_new:
            print(f"  Top rec: event_id={recs_new[0]['event_id']}  score={recs_new[0]['score']}")
        cold = is_cold_start_user("user-new-1")
        print(f"  is_cold_start_user() = {cold}  (expect True)")
    except Exception as e:
        print(f"  ❌ FAIL — exception: {e}")
 
    print("\n" + "=" * 60)
    print("Tests complete.")
 