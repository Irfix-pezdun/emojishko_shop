import httpx

from .config import get_settings

settings = get_settings()

API_BASE = "https://api.telegram.org"

# Эти статусы считаются "подписан". Любой другой (left, kicked, restricted-вне-канала
# на практике не применим к каналам) считается "не подписан".
SUBSCRIBED_STATUSES = {"member", "administrator", "creator"}


class TelegramApiError(Exception):
    pass


async def _call(method: str, **params) -> dict:
    if not settings.bot_token:
        raise TelegramApiError("BOT_TOKEN не настроен")
    url = f"{API_BASE}/bot{settings.bot_token}/{method}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json=params)
    data = resp.json()
    if not data.get("ok"):
        raise TelegramApiError(data.get("description", "unknown Telegram API error"))
    return data["result"]


async def is_subscribed(user_id: int) -> bool:
    """
    Проверяет подписку пользователя на канал автора через getChatMember.
    Боту нужны права администратора в канале, иначе Telegram вернёт ошибку доступа.
    """
    if not settings.channel_id_for_api:
        raise TelegramApiError("CHANNEL_USERNAME/CHANNEL_CHAT_ID не настроены")
    try:
        result = await _call(
            "getChatMember",
            chat_id=settings.channel_id_for_api,
            user_id=user_id,
        )
    except TelegramApiError:
        # чаще всего это значит, что бот не админ канала — пробрасываем дальше,
        # роутер вернёт понятную ошибку вместо молчаливого "не подписан"
        raise
    return result.get("status") in SUBSCRIBED_STATUSES


async def notify_author(text: str) -> None:
    """Отправляет автору личное сообщение (нужен числовой AUTHOR_TELEGRAM_ID — см. README / команду /myid)."""
    if not settings.author_telegram_id:
        return  # не настроено — просто не уведомляем, заявка всё равно сохранена в БД
    await _call(
        "sendMessage",
        chat_id=settings.author_telegram_id,
        text=text,
        parse_mode="HTML",
    )
