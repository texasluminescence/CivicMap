from dotenv import load_dotenv
import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, timezone
import numpy as np
import ast

# ========== CONFIG ==========
load_dotenv(Path(__file__).parent.parent / ".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase env vars")

# ========== MOCK USERS ==========
MOCK_USERS = {
    "user-budget-fan": {
        "categories": ["Town Hall", "Budget Workshop", "Policy Forum"],
        "tones": ["Formal"],
        "sectors": ["Central"],
        "schedule": ["Weekdays", "Evenings"],
        "format": ["In-Person"]
    },
    "user-arts-lover": {
        "categories": ["Arts & Culture", "Community Festival"],
        "tones": ["Casual"],
        "sectors": ["East", "South"],
        "schedule": ["Weekends"],
        "format": ["In-Person", "Virtual"]
    },
    "user-virtual-only": {
        "categories": ["Policy Forum", "Educational Workshop"],
        "tones": ["Formal", "Casual"],
        "sectors": ["Central", "North"],
        "schedule": ["Weekdays", "Evenings"],
        "format": ["Virtual"]
    }
}

def get_user_prefs(user_id):
    return MOCK_USERS.get(user_id)

# ========== INIT ==========
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== HELPERS ==========
def normalize(vec):
    return vec / np.linalg.norm(vec)

def parse_event_time(event_date):
    dt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
    is_weekend = dt.weekday() >= 5
    is_evening = dt.hour >= 17
    return is_weekend, is_evening

# ========== MAIN FUNCTION ==========
def rank_events_for_user(user_id, event_ids=None):
    user_prefs = get_user_prefs(user_id)

    if not user_prefs:
        return {"error": "User has no preferences"}

    # ---- User embedding ----
    cat_embeds = model.encode(user_prefs["categories"])
    user_vector = normalize(np.mean(cat_embeds, axis=0))

    # ---- Fetch events ----
    query = supabase.table("events").select(
        "id, title, categories, embedding, tone, sector, is_virtual, event_date"
    )

    if event_ids:
        query = query.in_("id", event_ids)

    response = query.execute()
    events = response.data or []

    results = []

    for event in events:
        if not event.get("embedding"):
            score = 0.0
        else:
            event_vec = normalize(np.array(ast.literal_eval(event["embedding"])))
            base_score = cosine_similarity(
                user_vector.reshape(1, -1),
                event_vec.reshape(1, -1)
            )[0][0]

            booster = 1.0

            # ---- Tone ----
            if event.get("tone") in user_prefs["tones"]:
                booster *= 1.2

            # ---- Sector ----
            if event.get("sector") in user_prefs["sectors"]:
                booster *= 1.15
            else:
                booster *= 0.9

            # ---- Format ----
            if event.get("is_virtual") and "Virtual" in user_prefs["format"]:
                booster *= 1.1
            elif not event.get("is_virtual") and "In-Person" in user_prefs["format"]:
                booster *= 1.1
            else:
                booster *= 0.8

            # ---- Schedule ----
            if event.get("event_date"):
                is_weekend, is_evening = parse_event_time(event["event_date"])

                if is_weekend and "Weekends" in user_prefs["schedule"]:
                    booster *= 1.1
                if not is_weekend and "Weekdays" in user_prefs["schedule"]:
                    booster *= 1.1
                if is_evening and "Evenings" in user_prefs["schedule"]:
                    booster *= 1.1

            score = base_score * booster
            score = min(score, 1.0)

        results.append({
            "event_id": event["id"],
            "score": round(float(score), 3),
            "match_reason": event.get("category", "N/A")
        })

    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "user_id": user_id,
        "ranked_events": results,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ========== TEST RUN ==========
if __name__ == "__main__":
    for uid in ["user-budget-fan", "user-arts-lover", "user-virtual-only"]:
        print(f"\nTop events for {uid}:")
        output = rank_events_for_user(uid)
        for e in output["ranked_events"][:5]:
            print(f" - {e['event_id']} | {e['score']} | {e['match_reason']}")
