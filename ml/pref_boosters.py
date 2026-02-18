from dotenv import load_dotenv
import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from datetime import datetime
import ast

# ================= CONFIG =================
load_dotenv(Path(__file__).parent.parent / ".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY") 

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")

# ================= USER PREFERENCES =================
USER_PREFS = {
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
    return USER_PREFS.get(user_id)

# ================= INIT CLIENTS =================
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ================= FETCH EVENTS =================
print("Fetching events with embeddings from Supabase...")
response = supabase.table("events").select(
    "id, title, description, embedding, tone, sector, is_virtual, event_date"
).execute()

events = response.data or []
events = [e for e in events if e.get("embedding")]

if not events:
    raise RuntimeError("No events with embeddings found!")

print(f"Found {len(events)} events with embeddings.")

# ================= USER VECTOR =================
user_id = "user-budget-fan"  # change as needed
user_prefs = get_user_prefs(user_id)
if not user_prefs:
    raise RuntimeError(f"No preferences found for {user_id}")

# Encode user categories
category_embeddings = model.encode(user_prefs["categories"])
user_vector = np.mean(category_embeddings, axis=0)
user_vector = user_vector / np.linalg.norm(user_vector)

# ================= CALCULATE SCORES =================
final_scores = []

for event in events:
    event_embedding = np.array(ast.literal_eval(event["embedding"]))
    event_embedding = event_embedding / np.linalg.norm(event_embedding)

    base_score = cosine_similarity(user_vector.reshape(1, -1), event_embedding.reshape(1, -1))[0][0]

    # ===== Boosters =====
    booster = 1.0

    # Tone
    if event.get("tone") in user_prefs["tones"]:
        booster *= 1.2

    # Sector
    if event.get("sector") in user_prefs["sectors"]:
        booster *= 1.15
    else:
        booster *= 0.9

    # Format
    event_virtual = event.get("is_virtual", False)
    if (event_virtual and "Virtual" in user_prefs["format"]) or (not event_virtual and "In-Person" in user_prefs["format"]):
        booster *= 1.1
    else:
        booster *= 0.8

    # Schedule
    try:
        event_date = datetime.fromisoformat(event["event_date"].replace("Z", "+00:00"))
        is_weekend = event_date.weekday() >= 5
        is_evening = event_date.hour >= 17
        schedule_match = False
        if is_weekend and "Weekends" in user_prefs["schedule"]:
            schedule_match = True
        if not is_weekend and "Weekdays" in user_prefs["schedule"]:
            schedule_match = True
        if is_evening and "Evenings" in user_prefs["schedule"]:
            schedule_match = True
        if not is_evening and "Mornings" in user_prefs["schedule"]:
            schedule_match = True
        if schedule_match:
            booster *= 1.1
        else:
            booster *= 0.9
    except Exception as e:
        pass  # if no date, skip schedule boosting

    # Apply booster and cap at 1.0
    final_score = min(base_score * booster, 1.0)
    final_scores.append((final_score, event))

# ================= SORT & SHOW =================
final_scores.sort(key=lambda x: x[0], reverse=True)

print(f"\nTop events for {user_id}:")
for score, event in final_scores[:10]:
    print(f" - {event['title']} ({event.get('tone', 'Unknown Tone')}, {event.get('sector', 'Unknown Sector')}, {'Virtual' if event.get('is_virtual') else 'In-Person'}) | Score: {score:.3f}")
