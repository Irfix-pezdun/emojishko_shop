"""
Валидация Telegram.WebApp.initData на бэкенде.
См. https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
Без этой проверки заявки можно подделать, подставив произвольный telegram_user_id.
"""
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from fastapi import Header, HTTPException

from .config import get_settings

settings = get_settings()

MAX_AUTH_AGE_SECONDS = 24 * 60 * 60  # initData считается свежим 24 часа


class TelegramUser:
    def __init__(self, id: int, username: str | None):
        self.id = id
        self.username = username


def _check_signature(init_data: str, bot_token: str) -> dict:
    pairs = dict(parse_qsl(init_data, strict_parsing=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise ValueError("no hash in init_data")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("bad signature")

    auth_date = int(pairs.get("auth_date", "0"))
    if auth_date and time.time() - auth_date > MAX_AUTH_AGE_SECONDS:
        raise ValueError("init_data expired")

    return pairs


def parse_init_data(init_data: str) -> TelegramUser:
    if settings.skip_init_data_check:
        # только для локальной разработки без реального Telegram — НЕ использовать в проде
        pairs = dict(parse_qsl(init_data, strict_parsing=True)) if init_data else {}
        raw_user = pairs.get("user")
        if raw_user:
            u = json.loads(raw_user)
            return TelegramUser(id=u.get("id", 0), username=u.get("username"))
        return TelegramUser(id=0, username="dev_user")

    if not settings.bot_token:
        raise HTTPException(500, "BOT_TOKEN не настроен на сервере")

    try:
        pairs = _check_signature(init_data, settings.bot_token)
    except ValueError as e:
        raise HTTPException(401, f"Невалидный initData: {e}")

    raw_user = pairs.get("user")
    if not raw_user:
        raise HTTPException(401, "initData не содержит данные пользователя")

    user = json.loads(raw_user)
    return TelegramUser(id=user["id"], username=user.get("username"))


async def require_telegram_user(x_telegram_init_data: str = Header(default="")) -> TelegramUser:
    """FastAPI dependency: читает initData из заголовка X-Telegram-Init-Data."""
    return parse_init_data(x_telegram_init_data)
