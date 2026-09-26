from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Lead, LeadType, LeadStatus
from ..schemas import FreeEmojiClaimIn, FreeEmojiClaimOut
from ..telegram_auth import require_telegram_user, TelegramUser
from ..telegram_api import is_subscribed, TelegramApiError, notify_author
from ..codes import generate_claim_code

router = APIRouter(prefix="/api/free-emoji", tags=["free-emoji"])
settings = get_settings()


def _chat_url() -> str | None:
    if not settings.author_username:
        return None
    return f"https://t.me/{settings.author_username.lstrip('@')}"


def _payload_desc(lead: Lead) -> str | None:
    if not lead.payload:
        return None
    return lead.payload.get("description")


def _is_pong(lead: Lead) -> bool:
    if not lead.payload:
        return False
    return (lead.payload.get("source") or "").lower() == "pong"


def _existing_free_claim(db: Session, user_id: int) -> Lead | None:
    """Обычный FREE — один раз за всё время (не pong)."""
    rows = (
        db.query(Lead)
        .filter(Lead.telegram_user_id == str(user_id), Lead.type == LeadType.free_trial)
        .all()
    )
    for r in rows:
        if not _is_pong(r):
            return r
    return None


def _last_pong_claim(db: Session, user_id: int) -> Lead | None:
    rows = (
        db.query(Lead)
        .filter(Lead.telegram_user_id == str(user_id), Lead.type == LeadType.free_trial)
        .order_by(Lead.created_at.desc())
        .all()
    )
    for r in rows:
        if _is_pong(r):
            return r
    return None


def _pong_within_day(lead: Lead) -> bool:
    if not lead or not lead.created_at:
        return False
    created = lead.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created < timedelta(hours=24)


def _unique_code(db: Session) -> str:
    for _ in range(20):
        code = generate_claim_code()
        exists = db.query(Lead).filter(Lead.code == code).first()
        if not exists:
            return code
    return generate_claim_code() + generate_claim_code()[-2:]


@router.get("/status", response_model=FreeEmojiClaimOut)
def free_emoji_status(
    user: TelegramUser = Depends(require_telegram_user),
    db: Session = Depends(get_db),
    source: str | None = None,
):
    src = (source or "free").lower()
    if src == "pong":
        last = _last_pong_claim(db, user.id)
        if last and _pong_within_day(last):
            return FreeEmojiClaimOut(
                status="daily_limit",
                chat_url=_chat_url(),
                code=last.code,
                description=_payload_desc(last),
            )
        return FreeEmojiClaimOut(status="not_claimed")

    existing = _existing_free_claim(db, user.id)
    if existing:
        return FreeEmojiClaimOut(
            status="already_claimed",
            chat_url=_chat_url(),
            code=existing.code,
            description=_payload_desc(existing),
        )
    return FreeEmojiClaimOut(status="not_claimed")


@router.post("/claim", response_model=FreeEmojiClaimOut)
async def claim_free_emoji(
    body: FreeEmojiClaimIn,
    user: TelegramUser = Depends(require_telegram_user),
    db: Session = Depends(get_db),
):
    src = (body.source or "free").lower()
    if src not in ("free", "pong"):
        src = "free"

    if src == "pong":
        last = _last_pong_claim(db, user.id)
        if last and _pong_within_day(last):
            return FreeEmojiClaimOut(
                status="daily_limit",
                chat_url=_chat_url(),
                code=last.code,
                description=_payload_desc(last),
            )
    else:
        existing = _existing_free_claim(db, user.id)
        if existing:
            return FreeEmojiClaimOut(
                status="already_claimed",
                chat_url=_chat_url(),
                code=existing.code,
                description=_payload_desc(existing),
            )

    try:
        subscribed = await is_subscribed(user.id)
    except TelegramApiError as e:
        raise HTTPException(502, f"Не удалось проверить подписку: {e}")

    if not subscribed:
        return FreeEmojiClaimOut(status="subscribe_required")

    code = _unique_code(db)
    nick = (body.nick or "").strip() or None
    logo = (body.logo or "").strip() or None
    colors = (body.colors or "").strip() or None
    payload = {
        "description": body.description.strip(),
        "nick": nick,
        "logo": logo,
        "colors": colors,
        "reference_emoji": body.reference_emoji,
        "reference_pack": body.reference_pack,
        "source": src,
    }

    lead = Lead(
        telegram_user_id=str(user.id),
        telegram_username=user.username,
        type=LeadType.free_trial,
        status=LeadStatus.claimed,
        code=code,
        payload=payload,
    )
    db.add(lead)
    db.commit()

    who = f"@{user.username}" if user.username else f"id {user.id}"
    extra = ""
    if nick:
        extra += f"\nНик: {nick}"
    if logo:
        extra += f"\nЛого: {logo}"
    if colors:
        extra += f"\nЦвета: {colors}"
    if body.reference_emoji:
        pack = body.reference_pack or "—"
        extra += f"\nРеференс: <code>{pack}/{body.reference_emoji}</code>"

    title = "Победа в Pong" if src == "pong" else "Бесплатный эмодзи"
    text = (
        f"<b>{title}</b>\n"
        f"Код: <code>{code}</code>\n"
        f"Кто: {who}\n"
        f"ID: <code>{user.id}</code>\n"
        f"Описание: {body.description.strip()}"
        f"{extra}"
    )
    try:
        await notify_author(text)
    except Exception:
        pass

    return FreeEmojiClaimOut(
        status="claimed",
        chat_url=_chat_url(),
        code=code,
        description=body.description.strip(),
    )
