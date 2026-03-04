from dotenv import load_dotenv
import os

load_dotenv(".env.local")
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env.local")

from supabase import create_client
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# ========== CONFIG ==========
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY") 
print(f"Using Supabase URL: {SUPABASE_URL}")
print(f"Using Supabase Key: {'***' + SUPABASE_KEY[-4:] if SUPABASE_KEY else None}")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")

# ========== INIT CLIENTS ==========
print("Loading embedding model (first run may take 1–2 minutes)...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== FETCH EVENTS ==========
print("Fetching events from Supabase...")
response = supabase.table("events").select("id, title, description, category").execute()
events = response.data

if not events:
    raise RuntimeError("No events found in the events table!")

print(f"Found {len(events)} events")

# ========== GENERATE + SAVE EMBEDDINGS ==========
success_count = 0
fail_count = 0

for event in tqdm(events, desc="Generating embeddings"):
    event_id = event["id"]

    title = event.get("title", "") or ""
    description = event.get("description", "") or ""
    category = event.get("category", "") or ""

    text = f"Title: {title}. Description: {description}. Category: {category}."

    try:
        embedding = model.encode(text)              # numpy array (384,)
        embedding_list = embedding.tolist()         # convert to list for Supabase

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

# ========== VERIFICATION ==========
print("\nVerifying embeddings in database...")
verify_response = supabase.table("events").select("id", count="exact").not_.is_("embedding", "null").execute()

print(f"Embeddings saved for {verify_response.count} / {len(events)} events")
