from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Lead, LeadType, LeadStatus
from ..schemas import OrderCreateIn, OrderCreateOut
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
