from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import ensure_schema
from . import models  # noqa: F401 — регистрирует модели перед create_all
from .routers import catalog, free_emoji, orders, admin

settings = get_settings()

ensure_schema()

app = FastAPI(title="Emoji Shop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# сами .tgs файлы отдаются как статика напрямую — фронт обращается к /assets/packs/...
app.mount("/assets/packs", StaticFiles(directory=str(settings.assets_dir)), name="assets")

app.include_router(catalog.router)
app.include_router(free_emoji.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def public_config():
    """Публичные настройки для фронта. author_telegram_id — чтобы показать админку только автору."""
    return {
        "channel_username": settings.channel_username,
        "author_username": settings.author_username,
        "author_telegram_id": str(settings.author_telegram_id or "").strip(),
    }
