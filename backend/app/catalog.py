"""
Каталог паков: файлы из /assets/packs + переопределения title/cover/order из SQLite (pack_meta).
"""
import json
import time
from pathlib import Path

from .config import get_settings
from .schemas import CatalogOut, PackOut, EmojiOut

settings = get_settings()

_CACHE_TTL = 15
_cache: CatalogOut | None = None
_cache_ts: float = 0.0

SKIP_IDS = {"pack-001", "pack_001", "first", "first-collection"}
SKIP_TITLES = {"первая коллекция", "first collection"}


def _load_pack_meta_file(pack_dir: Path) -> dict:
    meta_file = pack_dir / "pack.json"
    if meta_file.exists():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"id": pack_dir.name, "title": pack_dir.name, "tags": [], "description": "", "order": 999}


def _load_db_overrides() -> dict[str, dict]:
    """pack_id -> {title, cover, sort_order}"""
    try:
        from .db import SessionLocal
        from .models import PackMeta

        db = SessionLocal()
        try:
            rows = db.query(PackMeta).all()
            return {
                r.pack_id: {
                    "title": r.title,
                    "cover": r.cover,
                    "sort_order": r.sort_order,
                }
                for r in rows
            }
        finally:
            db.close()
    except Exception:
        return {}


def _build_catalog() -> CatalogOut:
    packs_dir = settings.assets_dir
    entries: list[tuple[int, str, PackOut]] = []
    overrides = _load_db_overrides()

    if not packs_dir.exists():
        return CatalogOut(packs=[])

    for pack_dir in sorted(p for p in packs_dir.iterdir() if p.is_dir()):
        tgs_files = sorted(pack_dir.glob("*.tgs"))
        if not tgs_files:
            continue

        meta = _load_pack_meta_file(pack_dir)
        pack_id = str(meta.get("id") or pack_dir.name)
        title = str(meta.get("title") or pack_dir.name)

        if pack_id.lower() in SKIP_IDS or title.strip().lower() in SKIP_TITLES:
            continue
        if pack_dir.name.lower() in SKIP_IDS:
            continue

        ov = overrides.get(pack_id) or overrides.get(pack_dir.name) or {}
        if ov.get("title"):
            title = ov["title"]
        order = ov.get("sort_order")
        if order is None:
            order = meta.get("order", 999)
        cover_name = ov.get("cover") or meta.get("cover") or tgs_files[0].name
        if cover_name and not str(cover_name).endswith(".tgs"):
            cover_name = f"{cover_name}.tgs"
        # если файла обложки нет — первый tgs
        if not (pack_dir / cover_name).exists():
            cover_name = tgs_files[0].name

        emoji = [
            EmojiOut(id=f.stem, url=f"/assets/packs/{pack_dir.name}/{f.name}")
            for f in tgs_files
        ]
        cover_url = f"/assets/packs/{pack_dir.name}/{cover_name}"

        pack_out = PackOut(
            id=pack_id,
            title=title,
            tags=meta.get("tags", []),
            description=meta.get("description", ""),
            cover_url=cover_url,
            emoji=emoji,
        )
        entries.append((int(order), pack_id, pack_out))

    entries.sort(key=lambda e: (e[0], e[1]))
    return CatalogOut(packs=[p for _, _, p in entries])


def get_catalog(force_refresh: bool = False) -> CatalogOut:
    global _cache, _cache_ts
    now = time.time()
    if force_refresh or _cache is None or (now - _cache_ts) > _CACHE_TTL:
        _cache = _build_catalog()
        _cache_ts = now
    return _cache


def invalidate_catalog_cache() -> None:
    global _cache, _cache_ts
    _cache = None
    _cache_ts = 0.0
