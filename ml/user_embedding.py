from sentence_transformers import SentenceTransformer
import numpy as np

# ========== INIT MODEL ==========
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# ========== EXAMPLE USER PREFERENCES ==========
user_categories = ["Town Hall", "Budget Workshop"]  # Replace with any user's preferred categories

# ========== GENERATE EMBEDDINGS ==========
category_embeddings = model.encode(user_categories)  # Shape: (num_categories, 384)

# ========== AVERAGE TO GET USER VECTOR ==========
user_vector = np.mean(category_embeddings, axis=0)  # Shape: (384,)

print(f"User embedding vector shape: {user_vector.shape}")
print("First 10 dimensions of the user vector for sanity check:", user_vector[:10])
