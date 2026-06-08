from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from backend.db.mongo import db_manager
from backend.auth_utils import hash_password, verify_password, create_jwt
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    """Creates a new user account and returns a JWT token."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    # Check if email already exists
    existing = await db.users.find_one({"email": req.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Create the user document
    user_doc = {
        "name": req.name.strip(),
        "email": req.email.lower().strip(),
        "password": hash_password(req.password),
        "createdAt": datetime.datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Create a blank financial profile for the new user
    await db.userprofiles.insert_one({
        "userId": user_id,
        "monthlyIncome": 0.0,
        "totalBalance": 0.0,
        "activeSavingsGoals": [],
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow(),
    })

    token = create_jwt(user_id, req.email.lower().strip())
    return {
        "success": True,
        "token": token,
        "user": {"user_id": user_id, "name": req.name.strip(), "email": req.email.lower().strip()},
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticates a user and returns a JWT token."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = str(user["_id"])
    token = create_jwt(user_id, user["email"])
    return {
        "success": True,
        "token": token,
        "user": {"user_id": user_id, "name": user.get("name", ""), "email": user["email"]},
    }
