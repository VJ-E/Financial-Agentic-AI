import os
import hashlib
from qdrant_client import QdrantClient
from qdrant_client.http import models

_client = None
_encoder = None

def get_qdrant_client():
    global _client
    if _client is None:
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        if qdrant_url and qdrant_api_key:
            _client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            _client = QdrantClient(path="local_qdrant")
    return _client

def get_encoder():
    global _encoder
    if _encoder is None:
        from sentence_transformers import SentenceTransformer
        _encoder = SentenceTransformer('all-MiniLM-L6-v2')
    return _encoder

COLLECTION_NAME = "transactions"

def init_qdrant():
    """Ensure the Qdrant collection exists and matches the encoder's dimensions."""
    client = get_qdrant_client()
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
    client = get_qdrant_client()
    encoder = get_encoder()
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
    client = get_qdrant_client()
    encoder = get_encoder()
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
