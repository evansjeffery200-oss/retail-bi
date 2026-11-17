from pathlib import Path

from fastapi import Request
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from .models import Business
from .money import format_date, format_money, format_number, today_input

TEMPLATE_DIR = Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATE_DIR))
templates.env.filters["money"] = format_money
templates.env.filters["date"] = format_date
templates.env.filters["count"] = format_number


def get_business(db: Session) -> Business:
    business = db.query(Business).order_by(Business.id).first()
    if business is None:
        business = Business()
        db.add(business)
        db.commit()
        db.refresh(business)
    return business


def store_label(business: Business) -> str:
    """The store's own name, or a neutral label when it has not been set.
    The seeded placeholder name is deliberately not shown."""
    name = (business.name or "").strip()
    return name if name else "Your store"


def ctx(request: Request, business: Business, user=None, **extra):
    def fmt(minor) -> str:
        return format_money(minor, business.currency_code, business.currency_locale)

    base = {
        "request": request,
        "business": business,
        "store_label": store_label(business),
        "user": user,
        "fmt": fmt,
        "today": today_input(),
        "active": "",
    }
    base.update(extra)
    return base
