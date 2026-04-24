import hashlib
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer

# Initialize Qdrant and SentenceTransformer globally accessible
client = QdrantClient(path="local_qdrant")
encoder = SentenceTransformer('all-MiniLM-L6-v2')

COLLECTION_NAME = "transactions"

def init_qdrant():
    """Ensure the Qdrant collection exists and matches the encoder's dimensions."""
    collections = client.get_collections().collections
    exists = any(c.name == COLLECTION_NAME for c in collections)
    
    if not exists:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=384,  # all-MiniLM-L6-v2 generates 384-dimensional vectors
                distance=models.Distance.COSINE
            )
        )
        print(f"Created Qdrant collection: {COLLECTION_NAME}")
    else:
        print(f"Qdrant collection {COLLECTION_NAME} already exists.")

def upsert_transaction(user_id: str, tx_id: str, description: str, amount: float, category: str, date: str):
    """Embeds the transaction description and upserts the vector into Qdrant."""
    vector = encoder.encode(description).tolist()
    
    # Qdrant requires unsigned integer IDs natively. Hashes tx_id.
    qdrant_id = int(hashlib.sha256(tx_id.encode('utf-8')).hexdigest(), 16) % ((1 << 63) - 1)
    
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=qdrant_id,
                payload={
                    "user_id": user_id,
                    "tx_id": tx_id,
                    "description": description,
                    "amount": amount,
                    "category": category,
                    "date": date
                },
                vector=vector,
            )
        ]
    )

def semantic_search(user_id: str, query: str, limit: int = 5):
    """Searches Qdrant for similar vectors constrained to the specific user_id."""
    query_vector = encoder.encode(query).tolist()
    
    hits = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="user_id",
                    match=models.MatchValue(value=user_id)
                )
            ]
        ),
        limit=limit
    )
    
    # Map the resulting list of matching hits' payloads for LLM context injection natively.
    return [hit.payload for hit in hits]
