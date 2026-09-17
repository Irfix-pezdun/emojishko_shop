"""
Админ-эндпоинты для бота (и других внутренних клиентов).
Авторизация: Authorization: Bearer <BOT_TOKEN> — тот же токен, что у бота.
Так боту не нужно лезть в БД через sys.path.
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
import hmac

from ..config import get_settings
from ..db import get_db
from ..models import Lead
from ..schemas import LeadOut
from ..catalog import get_catalog
from ..schemas import CatalogOut

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
    """Пересканировать packs после /addemoji или /delemoji."""
    return get_catalog(force_refresh=True)
