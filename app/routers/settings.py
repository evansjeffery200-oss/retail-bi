from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import require_admin
from ..templating import ctx, get_business, templates

router = APIRouter()


def _render(request: Request, db: Session, user: User, business=None, notice: str | None = None):
    business = business or get_business(db)
    return templates.TemplateResponse(
        request,
        "settings.html",
        ctx(request, business, user, active="settings", notice=notice),
    )


@router.get("/settings", response_class=HTMLResponse)
def settings_page(
    request: Request,
    notice: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    return _render(request, db, user, notice=notice)


@router.post("/settings")
def save_settings(
    name: str = Form(""),
    currency_code: str = Form("NGN"),
    currency_locale: str = Form("en-NG"),
    tax_rate: str = Form("0"),
    tax_enabled: str = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    business = get_business(db)
    business.name = name.strip() or "My Store"
    business.currency_code = (currency_code.strip() or "NGN").upper()
    business.currency_locale = currency_locale.strip() or "en-NG"
    try:
        business.tax_rate = float(tax_rate or 0)
    except ValueError:
        business.tax_rate = 0.0
    business.tax_enabled = tax_enabled == "on"
    db.commit()
    return RedirectResponse("/settings?notice=Settings+saved", status_code=303)
