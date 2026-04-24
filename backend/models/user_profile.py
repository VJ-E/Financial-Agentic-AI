from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SavingsGoal(BaseModel):
    shortId: str
    title: str
    targetAmount: float
    currentAmount: float = 0.0


class UserProfile(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    userId: str
    monthlyIncome: float = 0.0
    totalBalance: float = 0.0
    activeSavingsGoals: List[SavingsGoal] = Field(default_factory=list)
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "userId": "user123",
                "monthlyIncome": 5000.0,
                "totalBalance": 12500.0,
                "activeSavingsGoals": [
                    {
                        "shortId": "S123",
                        "title": "Emergency Fund",
                        "targetAmount": 10000.0,
                        "currentAmount": 2500.0
                    }
                ]
            }
        }
    )
