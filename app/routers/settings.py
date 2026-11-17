from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import clean_signup_code, current_user, new_signup_code
from ..templating import ctx, get_business, templates

router = APIRouter()


def _render(request: Request, db: Session, user: User, business=None, notice: str | None = None):
    business = business or get_business(db)
    users = db.scalars(select(User).order_by(User.created_at)).all()
    invite = f"{str(request.base_url).rstrip('/')}/signup?code={business.signup_code or ''}"
    return templates.TemplateResponse(
        request,
        "settings.html",
        ctx(
            request,
            business,
            user,
            active="settings",
            users=users,
            invite_link=invite,
            notice=notice,
        ),
    )


@router.get("/settings", response_class=HTMLResponse)
def settings_page(
    request: Request,
    notice: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
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
    user: User = Depends(current_user),
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


@router.post("/settings/signups")
def save_signups(
    signup_open: str = Form(None),
    signup_code: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    business = get_business(db)
    business.signup_open = signup_open == "on"
    code = clean_signup_code(signup_code)
    if code and len(code) >= 4:
        business.signup_code = code
    elif not business.signup_code:
        business.signup_code = new_signup_code()
    db.commit()
    return RedirectResponse("/settings?notice=Sign-up+settings+saved", status_code=303)


@router.post("/settings/signups/regenerate")
def regenerate_code(db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)
    business.signup_code = new_signup_code()
    db.commit()
    return RedirectResponse("/settings?notice=New+sign-up+code+created", status_code=303)
