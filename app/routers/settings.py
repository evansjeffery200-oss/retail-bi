import re

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import current_user, hash_password, require_admin, verify_password
from ..templating import ctx, get_business, templates

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _render(
    request: Request,
    db: Session,
    user: User,
    business=None,
    notice: str | None = None,
    error: str | None = None,
):
    business = business or get_business(db)
    return templates.TemplateResponse(
        request,
        "settings.html",
        ctx(request, business, user, active="settings", notice=notice, error=error),
    )


def _back(message: str, kind: str = "notice") -> RedirectResponse:
    from urllib.parse import quote

    return RedirectResponse(f"/settings?{kind}={quote(message)}#profile", status_code=303)


@router.get("/settings", response_class=HTMLResponse)
def settings_page(
    request: Request,
    notice: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    return _render(request, db, user, notice=notice, error=error)


@router.post("/settings/profile")
def save_profile(
    full_name: str = Form(""),
    email: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    email = (email or "").strip().lower()
    name = (full_name or "").strip()

    if not EMAIL_RE.match(email):
        return _back("That does not look like an email address", "error")
    if len(name) > 120:
        return _back("Keep the name under 120 characters", "error")

    taken = db.scalar(select(User).where(User.email == email, User.id != user.id))
    if taken is not None:
        return _back("Another account already uses that email", "error")

    email_changed = email != user.email
    user.full_name = name or None
    user.email = email
    db.commit()
    if email_changed:
        return _back("Profile saved. Sign in with your new email next time.")
    return _back("Profile saved")


@router.post("/settings/password")
def save_password(
    current_password: str = Form(""),
    new_password: str = Form(""),
    confirm_password: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not verify_password(current_password, user.password_hash):
        return _back("Your current password is not right", "error")
    if len(new_password or "") < 8:
        return _back("Use at least 8 characters for the new password", "error")
    if new_password != confirm_password:
        return _back("The two new passwords do not match", "error")
    if new_password == current_password:
        return _back("That is already your password", "error")
    user.password_hash = hash_password(new_password)
    db.commit()
    return _back("Password changed")


@router.post("/settings/appearance")
def save_appearance(
    reduced_motion: str = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    user.reduced_motion = reduced_motion == "on"
    db.commit()
    return _back("Appearance saved")


@router.post("/settings/store")
def save_store(
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
    return RedirectResponse("/settings?notice=Store+settings+saved#store", status_code=303)
