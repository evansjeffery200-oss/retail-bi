from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .db import Base, SessionLocal, engine
from .models import Business, User
from .routers import admin, auth, dashboard, expenses, help, products, sales, settings as settings_router, stock
from .security import hash_password, new_signup_code
from .templating import get_business, templates

STATIC_DIR = Path(__file__).parent / "static"


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def add_late_columns() -> None:
    """Columns added after the first deploy. Safe to re-run: existing columns are ignored."""
    boolean_default = "TRUE" if engine.dialect.name == "postgresql" else "1"
    statements = [
        "ALTER TABLE users ADD COLUMN full_name VARCHAR(120)",
        f"ALTER TABLE business ADD COLUMN signup_open BOOLEAN NOT NULL DEFAULT {boolean_default}",
        "ALTER TABLE business ADD COLUMN signup_code VARCHAR(24)",
        "ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'member'",
        f"ALTER TABLE users ADD COLUMN tour_done BOOLEAN NOT NULL DEFAULT {boolean_default}",
        "ALTER TABLE business ADD COLUMN support_email VARCHAR(255)",
        "ALTER TABLE business ADD COLUMN support_phone VARCHAR(40)",
    ]
    for statement in statements:
        try:
            with engine.begin() as connection:
                connection.execute(text(statement))
        except Exception:
            # Column already there (fresh database) or dialect refused; either way carry on.
            pass


def ensure_business_defaults() -> None:
    """Give the store a sign-up code so the invite field on the create-account page works."""
    with SessionLocal() as db:
        business = get_business(db)
        changed = False
        if not business.signup_code:
            business.signup_code = new_signup_code()
            changed = True
        if not (business.support_email or "").strip():
            business.support_email = "evansjeffery200@gmail.com"
            changed = True
        if business.signup_open is None:
            business.signup_open = True
            changed = True
        if changed:
            db.commit()


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


def ensure_roles() -> None:
    """The account created from the environment is the administrator. If no admin
    exists at all, the earliest account takes the role so the app is never locked."""
    with SessionLocal() as db:
        users = db.scalars(select(User).order_by(User.created_at, User.id)).all()
        if not users:
            return
        changed = False
        if settings.initial_email:
            owner = next(
                (u for u in users if u.email.lower() == settings.initial_email.lower()), None
            )
            if owner is not None and not owner.is_admin:
                owner.role = "admin"
                changed = True
        if not any(u.is_admin for u in users):
            users[0].role = "admin"
            changed = True
        if changed:
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    add_late_columns()
    seed_from_env()
    ensure_roles()
    ensure_business_defaults()
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
app.include_router(admin.router)
app.include_router(help.router)


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code in (303, 307) and exc.headers and "Location" in exc.headers:
        return RedirectResponse(exc.headers["Location"], status_code=303)
    if exc.status_code == 403:
        return templates.TemplateResponse(
            request,
            "forbidden.html",
            {"request": request, "reason": exc.detail or "That page is for administrators"},
            status_code=403,
        )
    if exc.status_code == 404:
        return HTMLResponse(
            "<main style='font-family:system-ui;padding:48px'>"
            "<h1 style='font-size:20px'>Page not found</h1>"
            "<p><a href='/' style='color:#0f766e'>Back to dashboard</a></p></main>",
            status_code=404,
        )
    return HTMLResponse(f"<h1>{exc.status_code}</h1>", status_code=exc.status_code)
