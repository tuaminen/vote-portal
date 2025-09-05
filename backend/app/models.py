from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field

class Item(SQLModel, table=True):
    __tablename__ = "items"

    id: Optional[int] = Field(default=None, primary_key=True)
    description: str = Field(index=True)
    image_bytes: bytes  # stored directly in DB
    image_mime: str = Field(default="application/octet-stream")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Vote(SQLModel, table=True):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "item_id", name="uq_vote_user_item"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    item_id: int = Field(foreign_key="items.id", index=True)
    score: int = Field(nullable=False, description="-5..5")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

