
# ===================== app/main.py =====================
from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy import func, delete
from .db import init_db, get_session
from .models import Item, Vote
from .schemas import ItemMeta, ItemCreated, VoteBatchIn, ResultItem

app = FastAPI(title="Vote API", version="1.0.0")

# CORS (tarkenna origin devissä)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # vaihda esim. ["http://localhost:4200"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# -------- Items --------
@app.post("/items", response_model=ItemCreated, status_code=201)
async def create_item(
    description: str = Form(...),
    image: UploadFile = File(...),
):
    # Lue bytes ja mime
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload")
    mime = image.content_type or "application/octet-stream"

    with get_session() as session:
        item = Item(description=description, image_bytes=data, image_mime=mime)
        session.add(item)
        session.commit()
        session.refresh(item)
        return ItemCreated(id=item.id)


@app.get("/items", response_model=list[ItemMeta])
def list_items():
    with get_session() as session:
        items = session.exec(select(Item.id, Item.description)).all()
        return [ItemMeta(id=i[0], description=i[1]) for i in items]


@app.get("/items/{item_id}/image")
def get_item_image(item_id: int):
    with get_session() as session:
        item = session.get(Item, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return Response(content=item.image_bytes, media_type=item.image_mime)


# -------- Votes --------
@app.post("/votes", status_code=204)
def submit_votes(payload: VoteBatchIn):
    """
    Tallentaa/ylikirjoittaa käyttäjän äänet.
    - Ei erillistä käyttäjätaulua; user_id tulee clientiltä
    - Ylikirjoitus: poistetaan olemassa oleva (user_id,item_id) ja lisätään uusi
    """
    with get_session() as session:
        # Pieni validointi että itemit ovat olemassa
        item_ids = {v.item_id for v in payload.votes}
        if item_ids:
            existing_count = session.exec(select(func.count()).select_from(Item).where(Item.id.in_(item_ids))).one()
            if existing_count != len(item_ids):
                raise HTTPException(status_code=400, detail="One or more item_id do not exist")

        for v in payload.votes:
            # Poista vanha ääni tältä käyttäjältä tälle itemille
            session.exec(
                delete(Vote).where(Vote.user_id == payload.user_id, Vote.item_id == v.item_id)
            )
            session.add(Vote(user_id=payload.user_id, item_id=v.item_id, score=v.score))
        session.commit()
        return Response(status_code=204)


# -------- Results --------
@app.get("/results", response_model=list[ResultItem])
def get_results():
    """Palauttaa item-kohtaisen äänimäärän (count)."""
    with get_session() as session:
        rows = session.exec(
            select(Vote.item_id, func.count(Vote.id)).group_by(Vote.item_id)
        ).all()
        return [ResultItem(item_id=row[0], count=row[1]) for row in rows]


@app.get("/results/{item_id}", response_model=ResultItem)
def get_item_result(item_id: int):
    with get_session() as session:
        count = session.exec(
            select(func.count(Vote.id)).where(Vote.item_id == item_id)
        ).one()
        return ResultItem(item_id=item_id, count=count)
