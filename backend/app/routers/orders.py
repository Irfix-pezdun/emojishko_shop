from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Lead, LeadType, LeadStatus
from ..schemas import OrderCreateIn, OrderCreateOut, MyOrderOut
from ..telegram_auth import require_telegram_user, TelegramUser
from ..telegram_api import notify_author

router = APIRouter(prefix="/api/order", tags=["orders"])


def _format_notification(order: OrderCreateIn, user: TelegramUser) -> str:
    who = f"@{user.username}" if user.username else f"id {user.id}"
    lines = [
        "🎁 <b>Новая заявка на пак эмодзи</b>",
        f"От: {who}",
        f"Тема: {order.theme}",
        f"Количество: {order.emoji_count}",
    ]
    if order.nick:
        lines.append(f"Ник: {order.nick}")
    if order.logo:
        lines.append(f"Лого: {order.logo}")
    if order.colors:
        lines.append(f"Цвета: {order.colors}")
    if order.styles:
        lines.append(f"Стиль: {', '.join(order.styles)}")
    if order.pack_style_hint:
        lines.append(f"Похожий на пак: {order.pack_style_hint}")
    if order.references:
        lines.append(f"Референсы: {order.references}")
    if order.contact:
        lines.append(f"Контакт: {order.contact}")
    if order.comment:
        lines.append(f"Комментарий: {order.comment}")
    return "\n".join(lines)


@router.post("", response_model=OrderCreateOut)
async def create_order(
    order: OrderCreateIn,
    user: TelegramUser = Depends(require_telegram_user),
    db: Session = Depends(get_db),
):
    lead = Lead(
        telegram_user_id=str(user.id),
        telegram_username=user.username,
        type=LeadType.full_order,
        status=LeadStatus.new,
        payload=order.model_dump(),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # уведомление лучше не роняет создание заявки — она уже сохранена в БД,
    # даже если Telegram API временно недоступен
    try:
        await notify_author(_format_notification(order, user))
    except Exception:
        pass

    return OrderCreateOut(id=lead.id, status=lead.status.value)



STATUS_LABELS = {
    "new": "Новая",
    "claimed": "Принята",
    "contacted": "На связи",
    "in_progress": "В работе",
    "completed": "Готово",
    "cancelled": "Отменена",
}


@router.get("/my", response_model=list[MyOrderOut])
def my_orders(
    user: TelegramUser = Depends(require_telegram_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Lead)
        .filter(Lead.telegram_user_id == str(user.id))
        .order_by(Lead.created_at.desc())
        .limit(50)
        .all()
    )
    out = []
    for r in rows:
        title = None
        if isinstance(r.payload, dict):
            title = (
                r.payload.get("theme")
                or r.payload.get("description")
                or r.payload.get("nick")
            )
        type_label = "free_trial" if r.type == LeadType.free_trial or str(r.type) == "free_trial" else "full_order"
        # enum safe
        tval = r.type.value if hasattr(r.type, "value") else str(r.type)
        sval = r.status.value if hasattr(r.status, "value") else str(r.status)
        out.append(
            MyOrderOut(
                id=r.id,
                type=tval,
                status=sval,
                code=getattr(r, "code", None),
                title=(title or "")[:120] or None,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
        )
    return out
