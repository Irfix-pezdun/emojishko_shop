from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from config import get_settings

router = Router(name="user")
settings = get_settings()


@router.message(CommandStart())
async def start(message: Message):
    if not settings.webapp_url:
        await message.answer(
            "Мини-апп пока не настроен: задай WEBAPP_URL в .env "
            "(HTTPS-адрес фронтенда) и перезапусти бота."
        )
        return

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✨ Открыть магазин эмодзи", web_app=WebAppInfo(url=settings.webapp_url))]
        ]
    )
    await message.answer(
        "Привет! Здесь можно посмотреть примеры моих эмодзи-паков, "
        "узнать обо мне и получить один бесплатный кастомный эмодзи 🎁",
        reply_markup=kb,
    )


@router.message(Command("myid"))
async def myid(message: Message):
    """Утилита для настройки: показывает числовой Telegram ID — нужен для AUTHOR_TELEGRAM_ID в .env,
    чтобы бэкенд мог присылать сюда уведомления о новых заявках."""
    await message.answer(
        f"Твой Telegram ID: <code>{message.from_user.id}</code>\n"
        f"Впиши его в .env как AUTHOR_TELEGRAM_ID и перезапусти бота и backend.",
        parse_mode="HTML",
    )
