from typing import Optional
from pydantic import BaseModel, Field


# ---------- catalog ----------

class EmojiOut(BaseModel):
    id: str
    url: str


class PackOut(BaseModel):
    id: str
    title: str
    tags: list[str] = []
    description: str = ""
    cover_url: str
    emoji: list[EmojiOut]


class CatalogOut(BaseModel):
    packs: list[PackOut]


# ---------- free emoji ----------

class FreeEmojiClaimIn(BaseModel):
    description: str = Field(..., min_length=3, max_length=500)
    nick: Optional[str] = Field(None, max_length=64)
    logo: Optional[str] = Field(None, max_length=500)  # ссылка на SVG/PNG или «в личку»
    colors: Optional[str] = Field(None, max_length=200)  # «синий и белый» / #hex
    reference_emoji: Optional[str] = Field(None, max_length=64)
    reference_pack: Optional[str] = Field(None, max_length=64)


class FreeEmojiClaimOut(BaseModel):
    status: str  # subscribe_required | claimed | already_claimed | not_claimed
    chat_url: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None


# ---------- orders ----------

class OrderCreateIn(BaseModel):
    theme: str = Field(..., min_length=1, max_length=500)
    emoji_count: int = Field(..., ge=1, le=100)
    styles: list[str] = []
    nick: Optional[str] = Field(None, max_length=64)
    logo: Optional[str] = Field(None, max_length=500)
    colors: Optional[str] = Field(None, max_length=200)
    references: Optional[str] = Field(None, max_length=1000)
    contact: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = Field(None, max_length=1000)
    pack_style_hint: Optional[str] = None


class OrderCreateOut(BaseModel):
    id: int
    status: str


# ---------- admin ----------

class LeadOut(BaseModel):
    id: int
    telegram_user_id: str
    telegram_username: str | None = None
    type: str
    status: str
    code: str | None = None
    description: str | None = None
    created_at: str
