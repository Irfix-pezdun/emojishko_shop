from fastapi import APIRouter

from ..catalog import get_catalog
from ..schemas import CatalogOut

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("", response_model=CatalogOut)
def read_catalog():
    return get_catalog()


@router.post("/refresh", response_model=CatalogOut)
def refresh_catalog():
    """Форсирует пересканирование /assets/packs — полезно сразу после добавления новых файлов."""
    return get_catalog(force_refresh=True)
