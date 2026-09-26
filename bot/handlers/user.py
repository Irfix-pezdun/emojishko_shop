from aiogram import Router
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
import httpx

from config import get_settings

router = Router(name="user")
settings = get_settings()


async def _register_user(message: Message) -> None:
    """Сохраняем пользователя в backend для рассылок /ras."""
    if not settings.api_base_url or not settings.bot_token:
        return
    try:
        url = settings.api_base_url.rstrip("/") + "/api/bot-users/register"
        headers = {"Authorization": f"Bearer {settings.bot_token}"}
        payload = {
            "telegram_user_id": str(message.from_user.id),
            "telegram_username": message.from_user.username,
            "first_name": message.from_user.first_name,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, headers=headers, json=payload)
    except Exception:
        pass


@router.message(CommandStart())
async def start(message: Message):
    await _register_user(message)

    if not settings.webapp_url:
        await message.answer(
            "Мини-апп пока не настроен: задай WEBAPP_URL в .env "
            "(HTTPS-адрес фронтенда) и перезапусти бота."
        )
        return

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(
                text="Открыть магазин эмодзи",
                web_app=WebAppInfo(url=settings.webapp_url),
            )]
        ]
    )
    await message.answer(
        "Привет! Здесь можно посмотреть примеры моих эмодзи-паков, "
        "узнать обо мне, сыграть в Pong и получить кастомный эмодзи.",
        reply_markup=kb,
    )


@router.message(Command("myid"))
async def myid(message: Message):
    await message.answer(
        f"Твой Telegram ID: <code>{message.from_user.id}</code>\n"
        f"Впиши его в .env как AUTHOR_TELEGRAM_ID и перезапусти бота и backend.",
        parse_mode="HTML",
    )
