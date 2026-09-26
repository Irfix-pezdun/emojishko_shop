from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import BotUser, Lead
from ..routers.admin import require_bot_token

router = APIRouter(prefix="/api/bot-users", tags=["bot-users"])


class RegisterIn(BaseModel):
    telegram_user_id: str = Field(..., min_length=1, max_length=32)
    telegram_username: str | None = Field(None, max_length=64)
    first_name: str | None = Field(None, max_length=128)


@router.post("/register", dependencies=[Depends(require_bot_token)])
def register_user(body: RegisterIn, db: Session = Depends(get_db)):
    uid = str(body.telegram_user_id).strip()
    row = db.query(BotUser).filter(BotUser.telegram_user_id == uid).first()
    now = datetime.now(timezone.utc)
    if row:
        row.telegram_username = body.telegram_username or row.telegram_username
        row.first_name = body.first_name or row.first_name
        row.updated_at = now
    else:
        row = BotUser(
            telegram_user_id=uid,
            telegram_username=body.telegram_username,
            first_name=body.first_name,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    db.commit()
    return {"ok": True, "telegram_user_id": uid}


@router.get("/ids", dependencies=[Depends(require_bot_token)])
def list_user_ids(db: Session = Depends(get_db)):
    """Все id: кто писал /start + кто оставлял заявки (на случай старых пользователей)."""
    ids: set[str] = set()
    for r in db.query(BotUser.telegram_user_id).all():
        if r[0]:
            ids.add(str(r[0]))
    for r in db.query(Lead.telegram_user_id).all():
        if r[0]:
            ids.add(str(r[0]))
    return {"ids": sorted(ids), "count": len(ids)}
