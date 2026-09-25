"""
Админ-эндпоинты.
- Bearer BOT_TOKEN — для бота
- X-Telegram-Init-Data + AUTHOR_TELEGRAM_ID — для мини-аппа автора
"""
from __future__ import annotations

import json
import re
import hmac
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Lead
from ..schemas import LeadOut, CatalogOut
from ..catalog import get_catalog
from ..telegram_auth import require_telegram_user, TelegramUser

router = APIRouter(prefix="/api/admin", tags=["admin"])
settings = get_settings()


def require_bot_token(authorization: str = Header(default="")) -> None:
    if not settings.bot_token:
        raise HTTPException(500, "BOT_TOKEN не настроен на сервере")
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Нужен заголовок Authorization: Bearer <BOT_TOKEN>")
    token = authorization[7:].strip()
    if not hmac.compare_digest(token, settings.bot_token):
        raise HTTPException(401, "Неверный токен")


async def require_admin_user(user: TelegramUser = Depends(require_telegram_user)) -> TelegramUser:
    if not settings.is_admin_id(user.id):
        raise HTTPException(403, "Только автор может управлять паками")
    return user


class PackUpdateIn(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=80)
    cover: str | None = Field(None, max_length=64)  # имя файла без пути, напр. e001.tgs или e001


class PackCreateIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)
    id: str | None = Field(None, max_length=64)


def _slugify(name: str) -> str:
    tr = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z",
        "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
        "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    }
    s = "".join(tr.get(c.lower(), c) for c in name)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower() or "pack"
    return s[:48]


def _pack_dir(pack_id: str) -> Path:
    safe = Path(pack_id).name  # no path traversal
    d = settings.assets_dir / safe
    if not d.exists() or not d.is_dir():
        raise HTTPException(404, f"Пак «{pack_id}» не найден")
    return d


def _load_meta(pack_dir: Path) -> dict:
    meta_file = pack_dir / "pack.json"
    if meta_file.exists():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"id": pack_dir.name, "title": pack_dir.name, "tags": [], "description": "", "order": 999}


def _save_meta(pack_dir: Path, meta: dict) -> None:
    (pack_dir / "pack.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )


@router.get("/leads", response_model=list[LeadOut], dependencies=[Depends(require_bot_token)])
def list_leads(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    rows = db.query(Lead).order_by(Lead.created_at.desc()).limit(limit).all()
    result = []
    for r in rows:
        desc = None
        if isinstance(r.payload, dict):
            desc = r.payload.get("description") or r.payload.get("theme")
        result.append(
            LeadOut(
                id=r.id,
                telegram_user_id=r.telegram_user_id,
                telegram_username=r.telegram_username,
                type=r.type.value if hasattr(r.type, "value") else str(r.type),
                status=r.status.value if hasattr(r.status, "value") else str(r.status),
                code=getattr(r, "code", None),
                description=desc,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
        )
    return result


@router.post("/catalog/refresh", response_model=CatalogOut, dependencies=[Depends(require_bot_token)])
def admin_refresh_catalog():
    return get_catalog(force_refresh=True)


@router.patch("/packs/{pack_id}", response_model=CatalogOut)
async def update_pack(
    pack_id: str,
    body: PackUpdateIn,
    _user: TelegramUser = Depends(require_admin_user),
):
    """Переименовать пак и/или сменить обложку (cover = e001 или e001.tgs)."""
    pack_dir = _pack_dir(pack_id)
    meta = _load_meta(pack_dir)

    if body.title is not None:
        meta["title"] = body.title.strip()

    if body.cover is not None:
        cover = body.cover.strip()
        if not cover.endswith(".tgs"):
            cover = f"{cover}.tgs"
        if not (pack_dir / cover).exists():
            raise HTTPException(400, f"Файла {cover} нет в паке")
        meta["cover"] = cover

    meta["id"] = meta.get("id") or pack_dir.name
    _save_meta(pack_dir, meta)
    return get_catalog(force_refresh=True)


@router.post("/packs", response_model=CatalogOut)
async def create_pack(
    body: PackCreateIn,
    _user: TelegramUser = Depends(require_admin_user),
):
    """Создать пустой пак (потом загрузи .tgs)."""
    settings.assets_dir.mkdir(parents=True, exist_ok=True)
    raw_id = (body.id or _slugify(body.title)).strip()
    pack_id = _slugify(raw_id)
    dest = settings.assets_dir / pack_id
    if dest.exists():
        raise HTTPException(400, f"Пак «{pack_id}» уже есть")
    dest.mkdir(parents=True)
    meta = {
        "id": pack_id,
        "title": body.title.strip(),
        "tags": [],
        "description": "",
        "order": 999,
    }
    _save_meta(dest, meta)
    return get_catalog(force_refresh=True)


@router.post("/packs/{pack_id}/emoji", response_model=CatalogOut)
async def upload_emoji(
    pack_id: str,
    file: UploadFile = File(...),
    _user: TelegramUser = Depends(require_admin_user),
):
    """Загрузить .tgs в пак."""
    pack_dir = _pack_dir(pack_id)
    name = (file.filename or "emoji.tgs").lower()
    if not name.endswith(".tgs"):
        raise HTTPException(400, "Нужен файл .tgs")

    existing = sorted(pack_dir.glob("*.tgs"))
    next_n = len(existing) + 1
    dest_name = f"e{next_n:03d}.tgs"
    # avoid overwrite
    while (pack_dir / dest_name).exists():
        next_n += 1
        dest_name = f"e{next_n:03d}.tgs"

    data = await file.read()
    if len(data) < 20:
        raise HTTPException(400, "Файл слишком маленький")
    if len(data) > 2_000_000:
        raise HTTPException(400, "Файл больше 2 МБ")

    (pack_dir / dest_name).write_bytes(data)

    meta = _load_meta(pack_dir)
    if not meta.get("cover"):
        meta["cover"] = dest_name
        _save_meta(pack_dir, meta)

    return get_catalog(force_refresh=True)


@router.delete("/packs/{pack_id}/emoji/{emoji_id}", response_model=CatalogOut)
async def delete_emoji(
    pack_id: str,
    emoji_id: str,
    _user: TelegramUser = Depends(require_admin_user),
):
    pack_dir = _pack_dir(pack_id)
    fname = emoji_id if emoji_id.endswith(".tgs") else f"{emoji_id}.tgs"
    fname = Path(fname).name
    target = pack_dir / fname
    if not target.exists():
        raise HTTPException(404, "Эмодзи не найден")
    target.unlink()

    meta = _load_meta(pack_dir)
    if meta.get("cover") == fname:
        left = sorted(pack_dir.glob("*.tgs"))
        meta["cover"] = left[0].name if left else None
        _save_meta(pack_dir, meta)

    return get_catalog(force_refresh=True)
