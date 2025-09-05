
# ===================== app/db.py =====================
from __future__ import annotations
from contextlib import contextmanager
from typing import Iterator
import os
from sqlmodel import SQLModel, create_engine, Session


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    # Default to Postgres-style URL; override for local dev if needed
    "postgresql+psycopg2://postgres:postgres@db:5432/votes",
)

enable_echo = os.getenv("SQL_ECHO", "0") == "1"
engine = create_engine(DATABASE_URL, echo=enable_echo, pool_pre_ping=True)


def init_db() -> None:
    # Create tables if they do not exist
    from . import models  # noqa: F401 (ensure models are imported)
    SQLModel.metadata.create_all(engine)


@contextmanager
def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session

