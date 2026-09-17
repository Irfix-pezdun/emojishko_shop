"""
Каталог паков собирается автоматически сканированием /assets/packs.
Чтобы добавить эмодзи — просто положи .tgs файл в папку пака (или создай новую
папку для нового пака) и вызови POST /api/catalog/refresh (или подожди TTL кэша).
Никакого ручного редактирования большого manifest.json не требуется.

Структура:
  assets/packs/<pack_id>/pack.json   (необязательно — метаданные пака)
  assets/packs/<pack_id>/*.tgs       (сами эмодзи, любые имена)
"""
import json
import time
from pathlib import Path

from .config import get_settings
from .schemas import CatalogOut, PackOut, EmojiOut

settings = get_settings()

_CACHE_TTL = 30  # секунд — чтобы не сканировать диск на каждый запрос, но подхватывать новые файлы быстро
_cache: dict | None = None
_cache_ts: float = 0.0


def _load_pack_meta(pack_dir: Path) -> dict:
    meta_file = pack_dir / "pack.json"
    if meta_file.exists():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    # разумные значения по умолчанию, если автор не создал pack.json
    return {"id": pack_dir.name, "title": pack_dir.name, "tags": [], "description": "", "order": 999}


def _build_catalog() -> CatalogOut:
    packs_dir = settings.assets_dir
    entries: list[tuple[int, PackOut]] = []

    if not packs_dir.exists():
        return CatalogOut(packs=[])

    for pack_dir in sorted(p for p in packs_dir.iterdir() if p.is_dir()):
        tgs_files = sorted(pack_dir.glob("*.tgs"))
        if not tgs_files:
            continue  # пустые папки пропускаем

        meta = _load_pack_meta(pack_dir)
        pack_id = meta.get("id", pack_dir.name)

        emoji = [
            EmojiOut(id=f.stem, url=f"/assets/packs/{pack_dir.name}/{f.name}")
            for f in tgs_files
        ]

        cover_name = meta.get("cover") or tgs_files[0].name
        cover_url = f"/assets/packs/{pack_dir.name}/{cover_name}"

        pack_out = PackOut(
            id=pack_id,
            title=meta.get("title", pack_dir.name),
            tags=meta.get("tags", []),
            description=meta.get("description", ""),
            cover_url=cover_url,
            emoji=emoji,
        )
        entries.append((meta.get("order", 999), pack_out))

    entries.sort(key=lambda e: e[0])
    return CatalogOut(packs=[p for _, p in entries])


def get_catalog(force_refresh: bool = False) -> CatalogOut:
    global _cache, _cache_ts
    now = time.time()
    if force_refresh or _cache is None or (now - _cache_ts) > _CACHE_TTL:
        _cache = _build_catalog()
        _cache_ts = now
    return _cache
