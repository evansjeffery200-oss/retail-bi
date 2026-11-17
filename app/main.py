from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .db import Base, SessionLocal, engine
from .models import Business, User
from .routers import auth, dashboard, expenses, products, sales, settings as settings_router, stock
from .security import hash_password

STATIC_DIR = Path(__file__).parent / "static"


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def seed_from_env() -> None:
    """Create the first login and store settings if they do not exist yet."""
    if not settings.initial_email or not settings.initial_password:
        return
    with SessionLocal() as db:
        existing = db.scalars(select(User).where(User.email == settings.initial_email)).first()
        password_hash = hash_password(settings.initial_password)
        if existing is None:
            db.add(User(email=settings.initial_email, password_hash=password_hash))
        else:
            # The environment is the source of truth for this single account, so updating
            # INITIAL_PASSWORD and restarting is enough to change the password.
            existing.password_hash = password_hash
        db.commit()
        if db.scalars(select(Business)).first() is None:
            db.add(
                Business(
                    name=settings.business_name,
                    currency_code=settings.currency_code,
                    currency_locale=settings.currency_locale,
                    tax_enabled=settings.tax_enabled,
                )
            )
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    seed_from_env()
    yield


app = FastAPI(title="Retail BI", lifespan=lifespan, docs_url=None, redoc_url=None)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="session",
    same_site="lax",
    https_only=settings.cookie_secure,
    max_age=60 * 60 * 24 * 30,
)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(expenses.router)
app.include_router(sales.router)
app.include_router(settings_router.router)


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code in (303, 307) and exc.headers and "Location" in exc.headers:
        return RedirectResponse(exc.headers["Location"], status_code=303)
    if exc.status_code == 404:
        return HTMLResponse(
            "<main style='font-family:system-ui;padding:48px'>"
            "<h1 style='font-size:20px'>Page not found</h1>"
            "<p><a href='/' style='color:#0f766e'>Back to dashboard</a></p></main>",
            status_code=404,
        )
    return HTMLResponse(f"<h1>{exc.status_code}</h1>", status_code=exc.status_code)
