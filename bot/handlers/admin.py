"""
Админ-команды для управления каталогом прямо из Telegram — без доступа к серверу.

  /packs                         — список паков
  /newpack <id> <Название>       — создать пак
  /addemoji <id>                 — режим загрузки .tgs документами
  /done                          — выйти из режима загрузки
  /delemoji <id> <имя|last>      — удалить эмодзи (e003 или last)
  /leads                         — последние заявки (через API backend)

Заявки читаются через HTTP /api/admin/leads (Bearer BOT_TOKEN), а не через sys.path.
"""
import asyncio
import json
import re
from pathlib import Path

import httpx
from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter, TelegramAPIError

from config import get_settings

router = Router(name="admin")
settings = get_settings()

MAX_TGS_BYTES = settings.max_tgs_bytes


class AddEmoji(StatesGroup):
    waiting_files = State()


def _is_admin(user_id: int) -> bool:
    return user_id in settings.admin_ids


def _pack_dir(pack_id: str) -> Path:
    return settings.assets_dir / pack_id


async def _api(method: str, path: str, **kwargs):
    url = settings.api_base_url.rstrip("/") + path
    headers = {"Authorization": f"Bearer {settings.bot_token}"}
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.request(method, url, headers=headers, **kwargs)
        return resp


async def _refresh_catalog():
    try:
        await _api("POST", "/api/admin/catalog/refresh")
    except Exception:
        pass


@router.message(Command("packs"))
async def list_packs(message: Message):
    if not _is_admin(message.from_user.id):
        return
    if not settings.assets_dir.exists():
        await message.answer("Паков пока нет.")
        return
    lines = []
    for pack_dir in sorted(settings.assets_dir.iterdir()):
        if not pack_dir.is_dir():
            continue
        count = len(list(pack_dir.glob("*.tgs")))
        meta_file = pack_dir / "pack.json"
        title = pack_dir.name
        if meta_file.exists():
            try:
                title = json.loads(meta_file.read_text(encoding="utf-8")).get("title", title)
            except json.JSONDecodeError:
                pass
        lines.append(f"• <code>{pack_dir.name}</code> — {title} ({count} эмодзи)")
    await message.answer("\n".join(lines) or "Паков пока нет.")


@router.message(Command("newpack"))
async def new_pack(message: Message):
    if not _is_admin(message.from_user.id):
        return
    parts = (message.text or "").split(maxsplit=2)
    if len(parts) < 3:
        await message.answer(
            "Использование: /newpack ид_пака Название пака\n"
            "Например: /newpack pack-002 Мемные реакции"
        )
        return
    _, pack_id, title = parts
    if not re.fullmatch(r"[a-z0-9\-]+", pack_id):
        await message.answer("ID пака — только латиница, цифры и дефис, например pack-002")
        return

    pack_dir = _pack_dir(pack_id)
    if pack_dir.exists():
        await message.answer("Пак с таким ID уже существует.")
        return

    pack_dir.mkdir(parents=True)
    meta = {"id": pack_id, "title": title, "tags": [], "cover": "", "order": 999, "description": ""}
    (pack_dir / "pack.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    await message.answer(
        f"Пак <code>{pack_id}</code> «{title}» создан.\n"
        f"Теперь пришли эмодзи: /addemoji {pack_id}"
    )


@router.message(Command("addemoji"))
async def add_emoji_start(message: Message, state: FSMContext):
    if not _is_admin(message.from_user.id):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("Использование: /addemoji ид_пака")
        return
    pack_id = parts[1].strip()
    if not _pack_dir(pack_id).exists():
        await message.answer("Такого пака нет. Посмотри /packs или создай через /newpack.")
        return

    await state.update_data(pack_id=pack_id)
    await state.set_state(AddEmoji.waiting_files)
    await message.answer(
        f"Ок, шли .tgs файлы документами (можно несколько подряд) — они добавятся в «{pack_id}».\n"
        f"Лимит размера: {MAX_TGS_BYTES // 1024} KB.\n"
        f"Когда закончишь — /done"
    )


@router.message(Command("done"))
async def add_emoji_done(message: Message, state: FSMContext):
    if await state.get_state() == AddEmoji.waiting_files.state:
        await state.clear()
        await _refresh_catalog()
        await message.answer("Готово, вышел из режима загрузки. Каталог обновлён.")


@router.message(AddEmoji.waiting_files, F.document)
async def receive_emoji_file(message: Message, state: FSMContext, bot: Bot):
    if not _is_admin(message.from_user.id):
        return
    doc = message.document
    name = (doc.file_name or "").lower()
    if not name.endswith(".tgs"):
        await message.answer("Это не .tgs файл, пропускаю.")
        return
    if doc.file_size and doc.file_size > MAX_TGS_BYTES:
        await message.answer(
            f"Файл слишком большой ({doc.file_size // 1024} KB). "
            f"Максимум {MAX_TGS_BYTES // 1024} KB."
        )
        return

    data = await state.get_data()
    pack_dir = _pack_dir(data["pack_id"])
    existing = sorted(pack_dir.glob("*.tgs"))
    used = set()
    for f in existing:
        m = re.fullmatch(r"e(\d+)\.tgs", f.name, re.I)
        if m:
            used.add(int(m.group(1)))
    next_num = 1
    while next_num in used:
        next_num += 1

    dest = pack_dir / f"e{next_num:03d}.tgs"
    file = await bot.get_file(doc.file_id)
    await bot.download_file(file.file_path, destination=dest)

    if dest.stat().st_size > MAX_TGS_BYTES:
        dest.unlink(missing_ok=True)
        await message.answer("Файл после загрузки превысил лимит, удалён.")
        return

    await message.answer(f"Добавлено как <code>{dest.name}</code> ✅ (продолжай или /done)")


@router.message(AddEmoji.waiting_files)
async def receive_emoji_wrong_type(message: Message):
    await message.answer("Жду .tgs файл документом. Если закончил — /done")


@router.message(Command("delemoji"))
async def delete_emoji(message: Message):
    """/delemoji pack-001 e003  или  /delemoji pack-001 last"""
    if not _is_admin(message.from_user.id):
        return
    parts = (message.text or "").split()
    if len(parts) < 3:
        await message.answer(
            "Использование:\n"
            "<code>/delemoji pack-001 e003</code> — удалить конкретный файл\n"
            "<code>/delemoji pack-001 last</code> — удалить последний по имени"
        )
        return
    pack_id, target = parts[1], parts[2]
    pack_dir = _pack_dir(pack_id)
    if not pack_dir.exists():
        await message.answer("Такого пака нет.")
        return

    if target.lower() == "last":
        files = sorted(pack_dir.glob("*.tgs"))
        if not files:
            await message.answer("В паке нет эмодзи.")
            return
        path = files[-1]
    else:
        name = target if target.endswith(".tgs") else f"{target}.tgs"
        path = pack_dir / name
        if not path.exists():
            await message.answer(f"Файла <code>{name}</code> нет в паке.")
            return

    path.unlink()
    await _refresh_catalog()
    await message.answer(f"Удалено: <code>{path.name}</code>")


@router.message(Command("leads"))
async def list_leads(message: Message):
    if not _is_admin(message.from_user.id):
        return
    try:
        resp = await _api("GET", "/api/admin/leads", params={"limit": 10})
    except Exception as e:
        await message.answer(
            f"Не удалось связаться с API ({settings.api_base_url}).\n"
            f"Проверь, что backend запущен и API_BASE_URL в .env верный.\n{e}"
        )
        return

    if resp.status_code == 401:
        await message.answer("API отклонил токен (401). Совпадает ли BOT_TOKEN у бота и backend?")
        return
    if resp.status_code != 200:
        await message.answer(f"API ошибка {resp.status_code}: {resp.text[:200]}")
        return

    leads = resp.json()
    if not leads:
        await message.answer("Заявок пока нет.")
        return

    lines = []
    for lead in leads:
        who = f"@{lead['telegram_username']}" if lead.get("telegram_username") else lead.get("telegram_user_id")
        ts = (lead.get("created_at") or "")[:16].replace("T", " ")
        code = lead.get("code") or "—"
        desc = (lead.get("description") or "")[:40]
        extra = f" — {desc}" if desc else ""
        lines.append(f"{ts} — {code} — {lead.get('type')} — {who}{extra}")
    await message.answer("\n".join(lines))


@router.message(Command("ras"))
async def broadcast(message: Message, bot: Bot):
    """Рассылка всем, кто писал боту.
    Пример: /ras В канале сейчас розыгрыш! Залетай.
    Только админ.
    """
    if not _is_admin(message.from_user.id):
        return

    text = (message.text or "")
    # убрать команду: /ras или /ras@botname
    parts = text.split(maxsplit=1)
    body = parts[1].strip() if len(parts) > 1 else ""
    if not body:
        await message.answer(
            "Как пользоваться:\n"
            "<code>/ras Текст рассылки</code>\n\n"
            "Пример:\n"
            "<code>/ras В канале сейчас розыгрыш! Залетай 🔥</code>\n\n"
            "Сообщение уйдёт всем, кто хотя бы раз нажал /start в боте."
        )
        return

    status = await message.answer("Собираю список пользователей…")

    ids: list[str] = []
    try:
        resp = await _api("GET", "/api/bot-users/ids")
        if resp.status_code == 200:
            data = resp.json()
            ids = [str(x) for x in (data.get("ids") or [])]
    except Exception as e:
        await status.edit_text(f"Не удалось получить список: {e}")
        return

    if not ids:
        await status.edit_text(
            "Пока нет ни одного пользователя.\n"
            "Как только кто-то нажмёт /start — он попадёт в базу рассылки."
        )
        return

    await status.edit_text(f"Рассылка на {len(ids)} чел…\nТекст:\n{body}")

    ok = 0
    fail = 0
    blocked = 0
    for i, uid in enumerate(ids):
        try:
            await bot.send_message(int(uid), body)
            ok += 1
        except TelegramForbiddenError:
            blocked += 1
            fail += 1
        except TelegramRetryAfter as e:
            await asyncio.sleep(float(e.retry_after) + 0.5)
            try:
                await bot.send_message(int(uid), body)
                ok += 1
            except Exception:
                fail += 1
        except (TelegramAPIError, Exception):
            fail += 1
        # ~20 msg/sec — безопасный лимит
        await asyncio.sleep(0.05)
        if (i + 1) % 50 == 0:
            try:
                await status.edit_text(
                    f"Рассылка… {i + 1}/{len(ids)}\n✅ {ok} · ❌ {fail} (блок {blocked})"
                )
            except Exception:
                pass

    await status.edit_text(
        f"Готово!\n"
        f"Всего: {len(ids)}\n"
        f"✅ Доставлено: {ok}\n"
        f"❌ Не доставлено: {fail}\n"
        f"🚫 Заблокировали бота: {blocked}"
    )


@router.message(Command("users"))
async def count_users(message: Message):
    """Сколько человек в базе рассылки."""
    if not _is_admin(message.from_user.id):
        return
    try:
        resp = await _api("GET", "/api/bot-users/ids")
        if resp.status_code == 200:
            data = resp.json()
            await message.answer(f"В базе рассылки: <b>{data.get('count', 0)}</b> чел.")
        else:
            await message.answer(f"Ошибка API: {resp.status_code}")
    except Exception as e:
        await message.answer(f"Ошибка: {e}")
