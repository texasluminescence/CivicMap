from dotenv import load_dotenv
import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import ast

# ========== CONFIG ==========
load_dotenv(Path(__file__).parent.parent / ".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")

# ========== INIT CLIENTS ==========
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== FETCH EVENTS WITH EMBEDDINGS ==========
print("Fetching events with embeddings from Supabase...")
response = supabase.table("events").select("id, title, embedding").execute()
events = response.data

if not events:
    raise RuntimeError("No events found in the events table!")

# Filter out events missing embeddings
events = [e for e in events if e.get("embedding")]
print(f"Found {len(events)} events with embeddings.")

# ========== CREATE USER VECTOR ==========
user_categories = ["Town Hall", "Budget Workshop"]  # Example user preference
category_embeddings = model.encode(user_categories)
user_vector = np.mean(category_embeddings, axis=0)
print(f"User embedding vector shape: {user_vector.shape}")

# ========== CALCULATE BASE SCORES ==========
base_scores = {}
for event in events:
    # Convert embedding to numpy array
    if isinstance(event["embedding"], str):
        event_embedding = np.array(ast.literal_eval(event["embedding"]))
    else:
        event_embedding = np.array(event["embedding"])
    
    # Cosine similarity
    sim = cosine_similarity(user_vector.reshape(1, -1), event_embedding.reshape(1, -1))[0][0]
    base_scores[event["id"]] = sim

# ========== TOP 5 EVENTS ==========
top5 = sorted(base_scores.items(), key=lambda x: x[1], reverse=True)[:5]
print("\nTop 5 base score events:")
for eid, score in top5:
    title = next((e["title"] for e in events if e["id"] == eid), "Unknown")
    print(f" - {title} | Score: {score:.3f}")

