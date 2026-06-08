from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.db.mongo import db_manager
from backend.auth_utils import hash_password, verify_password, create_jwt, get_current_user
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    username: str
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    identifier: str  # Can be username or email
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    """Creates a new user account with a unique username and returns a JWT token."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    username = req.username.strip().lower()

    # Validate username format
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if not username.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, hyphens, and underscores.")

    # Check if username already exists
    existing_username = await db.users.find_one({"username": username})
    if existing_username:
        raise HTTPException(status_code=409, detail="This username is already taken. Please choose another.")

    # Check if email already exists
    existing_email = await db.users.find_one({"email": req.email.lower().strip()})
    if existing_email:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Create the user document — username IS the user_id
    user_doc = {
        "username": username,
        "name": req.name.strip(),
        "email": req.email.lower().strip(),
        "password": hash_password(req.password),
        "createdAt": datetime.datetime.utcnow(),
    }
    await db.users.insert_one(user_doc)

    # Create a blank financial profile using the username as the userId
    await db.userprofiles.insert_one({
        "userId": username,
        "monthlyIncome": 0.0,
        "totalBalance": 0.0,
        "activeSavingsGoals": [],
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow(),
    })

    token = create_jwt(username, req.email.lower().strip())
    return {
        "success": True,
        "token": token,
        "user": {"user_id": username, "name": req.name.strip(), "email": req.email.lower().strip()},
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticates a user by username or email and returns a JWT token."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    identifier = req.identifier.strip().lower()

    # Try to find by username first, then by email
    user = await db.users.find_one({"username": identifier})
    if not user:
        user = await db.users.find_one({"email": identifier})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    if not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    token = create_jwt(user["username"], user["email"])
    return {
        "success": True,
        "token": token,
        "user": {"user_id": user["username"], "name": user.get("name", ""), "email": user["email"]},
    }

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db = db_manager.db
    db_user = await db.users.find_one({"username": user["user_id"]})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(request.old_password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    new_hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"username": user["user_id"]},
        {"$set": {"password": new_hashed}}
    )
    return {"success": True, "message": "Password changed successfully"}
