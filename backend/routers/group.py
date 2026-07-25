from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid
from backend.db.mongo import db_manager
from backend.models.group import Group, GroupMember, GroupRole
from backend.auth_utils import get_current_user

router = APIRouter(
    prefix="/api/finance/groups",
    tags=["groups"],
)

class CreateGroupRequest(BaseModel):
    name: str

class AddMemberRequest(BaseModel):
    userId: str
    role: GroupRole = GroupRole.CONTRIBUTOR

class SetActiveGroupRequest(BaseModel):
    activeGroupId: str | None = None

@router.post("")
async def create_group(req: CreateGroupRequest, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    new_group_id = str(uuid.uuid4())
    
    member = GroupMember(userId=user_id, role=GroupRole.ADMIN)
    
    new_group = Group(
        _id=new_group_id,
        name=req.name,
        admin_user_id=user_id,
        members=[member]
    )
    
    group_dict = new_group.model_dump(by_alias=True)
    await db_manager.db.groups.insert_one(group_dict)
    
    # Update user profile
    await db_manager.db.userprofiles.update_one(
        {"userId": user_id},
        {
            "$push": {"groupIds": new_group_id},
            "$set": {"activeGroupId": new_group_id}
        },
        upsert=True
    )
    
    return group_dict

@router.get("")
async def list_groups(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    groups_cursor = db_manager.db.groups.find({"members.userId": user_id})
    groups = await groups_cursor.to_list(length=100)
    
    # Convert _id to id for client
    for g in groups:
        g["id"] = g.pop("_id")
        
    return groups

@router.post("/{group_id}/members")
async def add_member(group_id: str, req: AddMemberRequest, user: dict = Depends(get_current_user)):
    admin_user_id = user["user_id"]
    
    # Verify group exists and user is admin
    group = await db_manager.db.groups.find_one({"_id": group_id, "admin_user_id": admin_user_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or you are not admin")
        
    # Check if user already in group
    for member in group.get("members", []):
        if member["userId"] == req.userId:
            raise HTTPException(status_code=400, detail="User already in group")
            
    new_member = GroupMember(userId=req.userId, role=req.role)
    
    await db_manager.db.groups.update_one(
        {"_id": group_id},
        {"$push": {"members": new_member.model_dump()}}
    )
    
    # Add group to user's profile
    await db_manager.db.userprofiles.update_one(
        {"userId": req.userId},
        {"$push": {"groupIds": group_id}},
        upsert=True
    )
    
    return {"status": "success", "member": new_member.model_dump()}

@router.put("/active")
async def set_active_group(req: SetActiveGroupRequest, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    
    # If activeGroupId is provided, ensure user is actually in that group
    if req.activeGroupId:
        group = await db_manager.db.groups.find_one({
            "_id": req.activeGroupId,
            "members.userId": user_id
        })
        if not group:
            raise HTTPException(status_code=403, detail="Not a member of this group")
            
    await db_manager.db.userprofiles.update_one(
        {"userId": user_id},
        {"$set": {"activeGroupId": req.activeGroupId}}
    )
    
    return {"status": "success", "activeGroupId": req.activeGroupId}
