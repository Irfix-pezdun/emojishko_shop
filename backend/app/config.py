"""
Централизованные настройки backend'а.
Все значения читаются из .env в корне проекта (общий для backend и bot),
чтобы не дублировать токен/username в двух местах.
"""
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # --- Telegram ---
    bot_token: str = ""
    channel_username: str = ""          # напр. @IRF_dsgn — куда должен быть подписан пользователь
    channel_chat_id: str = ""           # опционально: числовой id канала, если username не подходит
    author_username: str = ""           # напр. @IRFIX_Factor — личка автора для CTA на фронте
    author_telegram_id: str = ""        # числовой id автора — нужен, чтобы бот мог писать ему в личку
    admin_telegram_ids: str = ""      # доп. админы через запятую

    # --- Данные ---
    database_url: str = f"sqlite:///{PROJECT_ROOT / 'data' / 'emoji_shop.db'}"
    assets_dir: Path = PROJECT_ROOT / "assets" / "packs"

    # --- Web ---
    cors_origins: str = "*"             # список через запятую, для прод-домена мини-аппа
    skip_init_data_check: bool = False  # ТОЛЬКО для локальной разработки без Telegram!

    @property
    def channel_id_for_api(self) -> str:
        return self.channel_chat_id or self.channel_username

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def is_admin_id(self, telegram_id: int | str) -> bool:
        tid = str(telegram_id).strip()
        if not tid or tid == "0":
            return False
        allowed = set()
        if self.author_telegram_id.strip():
            allowed.add(self.author_telegram_id.strip())
        for part in self.admin_telegram_ids.split(","):
            if part.strip():
                allowed.add(part.strip())
        return tid in allowed


@lru_cache
def get_settings() -> Settings:
    return Settings()
