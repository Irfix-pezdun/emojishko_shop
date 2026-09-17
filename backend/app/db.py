from pathlib import Path
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import get_settings

settings = get_settings()

if settings.database_url.startswith("sqlite"):
    db_path = settings.database_url.replace("sqlite:///", "")
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    """create_all + мягкая миграция колонки code для уже существующих SQLite-баз."""
    Base.metadata.create_all(bind=engine)
    try:
        insp = inspect(engine)
        if "leads" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("leads")}
        if "code" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE leads ADD COLUMN code VARCHAR"))
    except Exception:
        pass
