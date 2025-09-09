
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

class TopicOut(BaseModel):
    title: str

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
    voters: int              # montako käyttäjää on äänestänyt
    score: int               # pisteiden summa (−5..5 per käyttäjä)
    average: float           # keskiarvo (−5..5)
    pos: int                 # positiivisten äänien määrä (score > 0)
    neg: int                 # negatiivisten äänien määrä (score < 0)
    rank: float              # engagement-painotettu piste (0..1), iso parempi
