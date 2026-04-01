from dotenv import load_dotenv
import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import numpy as np

# ========== CONFIG ==========
load_dotenv(Path(__file__).parent.parent / ".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")

# ========== INIT ==========
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== FETCH EVENTS ==========
response = supabase.table("events").select("id, title, description").execute()
events = response.data
if not events:
    raise RuntimeError("No events found in the events table!")

print(f"Found {len(events)} events")

# ========== GENERATE + SAVE EMBEDDINGS ==========
success_count = 0
fail_count = 0

for event in tqdm(events, desc="Generating embeddings"):
    event_id = event["id"]

    title = (event.get("title") or "").strip()
    description = (event.get("description") or "").strip()

    # Use only title + description
    text = f"{title}. {description}"

    try:
        embedding = model.encode(text)
        # normalize embedding for better cosine similarity later
        embedding = embedding / np.linalg.norm(embedding)
        embedding_list = embedding.tolist()

        supabase.table("events") \
            .update({"embedding": embedding_list}) \
            .eq("id", event_id) \
            .execute()

        success_count += 1

    except Exception as e:
        print(f"❌ Failed for event_id={event_id}: {e}")
        fail_count += 1

print("\n========== SUMMARY ==========")
print(f"✅ Success: {success_count}")
print(f"❌ Failed: {fail_count}")
print(f"📦 Total: {len(events)}")

