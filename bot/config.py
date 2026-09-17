from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    bot_token: str = ""
    webapp_url: str = ""
    channel_username: str = ""
    author_username: str = ""
    author_telegram_id: str = ""
    admin_telegram_ids: str = ""

    # URL backend API — бот ходит сюда за /leads и refresh каталога (не лезет в БД напрямую)
    api_base_url: str = "http://127.0.0.1:8000"

    assets_dir: Path = PROJECT_ROOT / "assets" / "packs"

    # лимит размера одного .tgs при загрузке через бота (байт)
    max_tgs_bytes: int = 512_000

    @property
    def admin_ids(self) -> set[int]:
        ids = set()
        if self.author_telegram_id:
            ids.add(int(self.author_telegram_id))
        for part in self.admin_telegram_ids.split(","):
            part = part.strip()
            if part:
                ids.add(int(part))
        return ids


@lru_cache
def get_settings() -> Settings:
    return Settings()
