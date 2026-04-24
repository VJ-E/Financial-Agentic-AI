from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CategoryEnum(str, Enum):
    FIXED = "Fixed"
    VARIABLE = "Variable"
    INCOME = "Income"


class Transaction(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    userId: str
    date: datetime = Field(default_factory=datetime.utcnow)
    description: str
    amount: float
    category: CategoryEnum
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "userId": "user123",
                "date": "2026-04-24T23:00:00Z",
                "description": "Grocery shopping",
                "amount": 150.50,
                "category": "Variable"
            }
        }
    )
