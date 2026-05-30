import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.mongo import db_manager
from backend.db.vector import init_qdrant
from backend.routers import finance, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    await db_manager.connect_to_database()
    # Initialize Vector DB specifically natively ensuring collection presence.
    init_qdrant()
    yield
    # Shutdown event
    await db_manager.close_database_connection()

app = FastAPI(
    title="Financial Agent Backend API",
    description="Microservice backend for the Next.js Financial Agent UI",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS so the Next.js frontend can communicate with the backend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Restrict to strictly `FRONTEND_URL` for secure Vercel deployment origin checking.
origins = [
    FRONTEND_URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(finance.router)
app.include_router(chat.router)

from backend.db.vector import get_qdrant_client

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Simple health check endpoint that also pings Qdrant to keep it awake.
    """
    try:
        client = get_qdrant_client()
        client.get_collections()
        return {"status": "ok", "qdrant": "awake"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
