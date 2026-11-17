import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    session_secret: str
    initial_email: str
    initial_password: str
    business_name: str
    currency_code: str
    currency_locale: str
    tax_enabled: bool
    cookie_secure: bool


def load_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL", "sqlite:///./retail.db")
    # Render/Heroku style URLs sometimes arrive as postgres:// which psycopg rejects.
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    secret = os.getenv("SESSION_SECRET", "")
    if len(secret) < 16:
        secret = "dev-only-insecure-secret-change-me"

    return Settings(
        database_url=database_url,
        session_secret=secret,
        initial_email=os.getenv("INITIAL_EMAIL", "").strip().lower(),
        initial_password=os.getenv("INITIAL_PASSWORD", ""),
        business_name=os.getenv("BUSINESS_NAME", ""),
        currency_code=os.getenv("CURRENCY_CODE", "NGN"),
        currency_locale=os.getenv("CURRENCY_LOCALE", "en-NG"),
        tax_enabled=_bool(os.getenv("TAX_ENABLED"), False),
        cookie_secure=_bool(os.getenv("COOKIE_SECURE"), False),
    )


settings = load_settings()
