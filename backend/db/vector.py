import os
import hashlib
from qdrant_client import QdrantClient
from qdrant_client.http import models
import google.generativeai as genai

_client = None

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

from backend.context import gemini_api_keys_var

def get_embedding(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Generates a 768-dimensional embedding using Google Gemini (0MB local RAM)."""
    api_keys = gemini_api_keys_var.get() or [os.getenv("GEMINI_API_KEY")]
    
    for key in api_keys:
        if not key: continue
        try:
            genai.configure(api_key=key.strip())
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type=task_type
            )
            return result['embedding']
        except Exception as e:
            if key == api_keys[-1]:
                raise e
    
    return []

COLLECTION_NAME = "transactions_v2"

def init_qdrant():
    """Ensure the Qdrant collection exists and matches the encoder's dimensions."""
    client = get_qdrant_client()
    collections = client.get_collections().collections
    exists = any(c.name == COLLECTION_NAME for c in collections)
    
    if not exists:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=768,  # Gemini text-embedding-004 generates 768-dimensional vectors
                distance=models.Distance.COSINE
            )
        )
        print(f"Created Qdrant collection: {COLLECTION_NAME}")
    else:
        print(f"Qdrant collection {COLLECTION_NAME} already exists.")

def upsert_transaction(user_id: str, tx_id: str, name: str, description: str, amount: float, category: str, date: str):
    """Embeds the transaction name and description and upserts the vector into Qdrant."""
    client = get_qdrant_client()
    vector = get_embedding(f"{name} {description}".strip(), task_type="retrieval_document")
    
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
                    "name": name,
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
    query_vector = get_embedding(query, task_type="retrieval_query")
    
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

def delete_all_transactions(user_id: str):
    """Deletes all Qdrant vectors for a specific user_id."""
    client = get_qdrant_client()
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="user_id",
                            match=models.MatchValue(value=user_id)
                        )
                    ]
                )
            )
        )
    except Exception as e:
        print(f"Error deleting user vectors from Qdrant: {e}")
