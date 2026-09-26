import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON

from .db import Base


class LeadType(str, enum.Enum):
    free_trial = "free_trial"
    full_order = "full_order"


class LeadStatus(str, enum.Enum):
    claimed = "claimed"          # free_trial: заявка принята, ждёт работы автора
    new = "new"                  # новая заявка на платный пак
    contacted = "contacted"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    telegram_user_id = Column(String, index=True, nullable=False)
    telegram_username = Column(String, nullable=True)
    type = Column(Enum(LeadType), nullable=False)
    status = Column(Enum(LeadStatus), nullable=False)
    # Уникальный код заявки (IRF-XXXX) — удобно искать глазами в уведомлениях
    code = Column(String, unique=True, index=True, nullable=True)
    # free_trial: {description, nick, logo, colors, reference_emoji, reference_pack}
    # full_order: поля формы заказа
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PackMeta(Base):
    """Переопределения названия / обложки / порядка — живут в SQLite, не сбрасываются при перезаходе."""
    __tablename__ = "pack_meta"

    pack_id = Column(String, primary_key=True)  # id папки пака
    title = Column(String, nullable=True)
    cover = Column(String, nullable=True)  # e001.tgs
    sort_order = Column(Integer, nullable=True, default=999)


class BotUser(Base):
    """Кто хотя бы раз нажал /start — база для рассылок /ras."""
    __tablename__ = "bot_users"

    telegram_user_id = Column(String, primary_key=True)
    telegram_username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
