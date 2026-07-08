from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TypeEnum(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class Transaction(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    userId: str
    name: str
    date: datetime = Field(default_factory=datetime.utcnow)
    description: str = ""
    amount: float
    type: TypeEnum
    category: str = "Unknown"
    source: str = "bank"
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "userId": "user123",
                "name": "Grocery",
                "date": "2026-04-24T23:00:00Z",
                "description": "Weekly shopping",
                "amount": 150.50,
                "type": "debit",
                "category": "Food",
                "source": "bank"
            }
        }
    )
