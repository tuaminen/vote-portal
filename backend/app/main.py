
# ===================== app/main.py =====================
from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy import func, delete, case
from .db import init_db, get_session
from .models import Item, Vote
from .schemas import ItemMeta, ItemCreated, VoteBatchIn, ResultItem

app = FastAPI(title="Vote API", version="1.1.0")

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


def _compute_rank(voters: int, score_sum: int, pos: int, neg: int) -> float:
    """
    Engagement-painotettu ranking 0..1 (iso parempi):
    - Wilsonin alaraja positiivisten osuudelle (pos/(pos+neg)), z=1.96
    - Yhdistetään normalized averageen (avg∈[-5,5] → 0..1)
    - Painotetaan osallistujamäärällä w = n / (n + k), k=10
    """
    n_votes = max(pos + neg, 0)
    if n_votes == 0:
        L = 0.0
    else:
        z = 1.96
        p = pos / n_votes
        denom = 1 + z*z / n_votes
        centre = p + z*z/(2*n_votes)
        margin = z * ((p*(1-p)/n_votes + z*z/(4*n_votes*n_votes)) ** 0.5)
        L = (centre - margin) / denom
        if L < 0:
            L = 0.0

    avg = (score_sum / voters) if voters else 0.0
    norm_avg = (avg + 5.0) / 10.0  # map -5..5 → 0..1
    k = 10.0
    w = voters / (voters + k)
    alpha = 0.6  # paino Wilsonille vs. keskiarvolle
    rank = (alpha * L + (1 - alpha) * norm_avg) * w
    return float(round(rank, 6))

@app.get("/results", response_model=list[ResultItem])
def get_results():
    with get_session() as session:
        rows = session.exec(
            select(
                Vote.item_id,
                func.count(Vote.id).label("voters"),
                func.coalesce(func.sum(Vote.score), 0).label("score"),
                func.coalesce(func.sum(case((Vote.score > 0, 1), else_=0)), 0).label("pos"),
                func.coalesce(func.sum(case((Vote.score < 0, 1), else_=0)), 0).label("neg"),
            ).group_by(Vote.item_id)
        ).all()
        result: list[ResultItem] = []
        for item_id, voters, score_sum, pos, neg in rows:
            avg = (score_sum / voters) if voters else 0.0
            rank = _compute_rank(int(voters), int(score_sum), int(pos), int(neg))
            result.append(ResultItem(
                item_id=int(item_id),
                voters=int(voters),
                score=int(score_sum),
                average=float(round(avg, 6)),
                pos=int(pos),
                neg=int(neg),
                rank=rank,
            ))
        return result

@app.get("/results/ranked", response_model=list[ResultItem])
def get_results_ranked():
    data = get_results()
    return sorted(data, key=lambda x: x.rank, reverse=True)
