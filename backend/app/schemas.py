
# ===================== app/schemas.py =====================
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# Responses
class ItemMeta(BaseModel):
    id: int
    description: str


class ItemCreated(BaseModel):
    id: int


class VoteIn(BaseModel):
    item_id: int
    score: int = Field(ge=-5, le=5)


class VoteBatchIn(BaseModel):
    user_id: str
    votes: List[VoteIn]


class ResultCount(BaseModel):
    item_id: int
    count: int


class ResultItem(BaseModel):
    item_id: int
    count: int
    # Optional extras
    # avg: float | None = None
