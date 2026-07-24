from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum

class GroupRole(str, Enum):
    ADMIN = "admin"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"

class GroupMember(BaseModel):
    userId: str
    role: GroupRole = GroupRole.CONTRIBUTOR
    joinedAt: datetime = Field(default_factory=datetime.utcnow)

class Group(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    name: str
    admin_user_id: str
    members: List[GroupMember] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "Family Budget",
                "admin_user_id": "user123",
                "members": [
                    {
                        "userId": "user123",
                        "role": "admin",
                        "joinedAt": "2026-09-17T00:00:00Z"
                    },
                    {
                        "userId": "user456",
                        "role": "contributor",
                        "joinedAt": "2026-09-17T00:00:00Z"
                    }
                ]
            }
        }
    )
