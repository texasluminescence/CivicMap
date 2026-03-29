from dotenv import load_dotenv
import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
import numpy as np
import ast

# ========== CONFIG ==========
load_dotenv(Path(__file__).parent.parent / ".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")

# ========== INIT ==========
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== FETCH EVENTS WITH EMBEDDINGS ==========
response = supabase.table("events").select("id, title, description, embedding").execute()
events = [e for e in response.data if e.get("embedding")]
print(f"Found {len(events)} events with embeddings.")

# ========== PARSE & NORMALIZE EMBEDDINGS ==========
for e in events:
    # parse string to list if needed
    if isinstance(e["embedding"], str):
        e["embedding_np"] = np.array(ast.literal_eval(e["embedding"]))
    else:
        e["embedding_np"] = np.array(e["embedding"])

    # normalize
    e["embedding_np"] /= np.linalg.norm(e["embedding_np"])

# ========== FUNCTION TO FIND SIMILAR EVENTS ==========
def find_similar_events(query, top_k=5):
    query_embedding = model.encode(query)
    query_embedding /= np.linalg.norm(query_embedding)

    similarities = []
    for event in events:
        sim = float(np.dot(query_embedding, event["embedding_np"]))
        similarities.append((sim, event))

    similarities.sort(key=lambda x: x[0], reverse=True)
    return similarities[:top_k]

# ========== TEST QUERIES ==========
test_queries = [
    "city government budget",
    "neighborhood community meeting",
    "arts and culture"
]

for q in test_queries:
    print(f"\nQuery: {q}")
    results = find_similar_events(q)
    for score, event in results:
        print(f"  {score:.3f} | {event['title']} ({event.get('description','')[:50]}...)")
