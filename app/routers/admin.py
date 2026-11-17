from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import clean_signup_code, new_signup_code, require_admin
from ..templating import ctx, get_business, templates

router = APIRouter()


def _notice(message: str) -> RedirectResponse:
    return RedirectResponse(f"/admin?notice={quote(message)}", status_code=303)


def _error(message: str) -> RedirectResponse:
    return RedirectResponse(f"/admin?error={quote(message)}", status_code=303)


def _admin_count(db: Session) -> int:
    return len(db.scalars(select(User).where(User.role == "admin")).all())


@router.get("/admin", response_class=HTMLResponse)
def admin_page(
    request: Request,
    notice: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    business = get_business(db)
    accounts = db.scalars(select(User).order_by(User.created_at, User.id)).all()
    invite = f"{str(request.base_url).rstrip('/')}/signup?code={business.signup_code or ''}"
    return templates.TemplateResponse(
        request,
        "admin.html",
        ctx(
            request,
            business,
            user,
            active="admin",
            accounts=accounts,
            admin_count=sum(1 for account in accounts if account.is_admin),
            invite_link=invite,
            notice=notice,
            error=error,
        ),
    )


@router.post("/admin/accounts/{account_id}/role")
def set_role(
    account_id: int,
    role: str = Form("member"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    target = db.get(User, account_id)
    if target is None:
        return _error("That account is no longer here")
    wanted = "admin" if role == "admin" else "member"
    if target.id == user.id:
        return _error("You cannot change your own role. Another administrator can.")
    if wanted == "member" and target.is_admin and _admin_count(db) <= 1:
        return _error("Keep at least one administrator")
    if target.role == wanted:
        return _notice(f"{target.email} is already a {target.role_label}")
    target.role = wanted
    db.commit()
    return _notice(f"{target.email} is now a {target.role_label}")


@router.post("/admin/accounts/{account_id}/remove")
def remove_account(
    account_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    target = db.get(User, account_id)
    if target is None:
        return _error("That account is no longer here")
    if target.id == user.id:
        return _error("You cannot remove the account you are signed in with")
    if target.is_admin and _admin_count(db) <= 1:
        return _error("Keep at least one administrator")
    email = target.email
    db.delete(target)
    db.commit()
    return _notice(f"{email} can no longer sign in")


@router.post("/admin/signups")
def save_signups(
    signup_open: str = Form(None),
    signup_code: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    business = get_business(db)
    business.signup_open = signup_open == "on"
    code = clean_signup_code(signup_code)
    if code and len(code) >= 4:
        business.signup_code = code
    elif not business.signup_code:
        business.signup_code = new_signup_code()
    db.commit()
    return _notice("Sign-up settings saved")


@router.post("/admin/signups/regenerate")
def regenerate_code(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    business = get_business(db)
    business.signup_code = new_signup_code()
    db.commit()
    return _notice("New store code created")
