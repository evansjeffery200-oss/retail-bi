import re

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import clean_signup_code, hash_password, verify_password
from ..templating import get_business, templates

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
MIN_PASSWORD = 8


def _page(request, template, business, **extra):
    data = {
        "request": request,
        "business": business,
        "signup_open": bool(business.signup_open),
    }
    data.update(extra)
    return data


@router.get("/welcome", response_class=HTMLResponse)
def welcome_page(request: Request, db: Session = Depends(get_db)):
    """Public landing page. It stays reachable while signed in, so it can be
    viewed or shared; the header simply offers the dashboard instead."""
    business = get_business(db)
    return templates.TemplateResponse(
        request,
        "welcome.html",
        _page(request, "welcome.html", business, signed_in=bool(request.session.get("uid"))),
    )


@router.get("/login")
def login_page(request: Request, db: Session = Depends(get_db)):
    if request.session.get("uid"):
        return RedirectResponse("/", status_code=303)
    business = get_business(db)
    return templates.TemplateResponse(
        request, "login.html", _page(request, "login.html", business, error=None, email="")
    )


@router.post("/login")
def login_submit(
    request: Request,
    email: str = Form(""),
    password: str = Form(""),
    db: Session = Depends(get_db),
):
    business = get_business(db)
    email = email.strip().lower()
    user = db.scalars(select(User).where(User.email == email)).first()

    if user is None or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(
            request,
            "login.html",
            _page(
                request,
                "login.html",
                business,
                error="Wrong email or password.",
                email=email,
            ),
            status_code=401,
        )

    request.session.clear()
    request.session["uid"] = user.id
    return RedirectResponse("/", status_code=303)


@router.get("/signup", response_class=HTMLResponse)
def signup_page(
    request: Request,
    code: str = "",
    email: str = "",
    db: Session = Depends(get_db),
):
    if request.session.get("uid"):
        return RedirectResponse("/", status_code=303)
    business = get_business(db)
    return templates.TemplateResponse(
        request,
        "signup.html",
        _page(
            request,
            "signup.html",
            business,
            error=None,
            full_name="",
            email=email,
            code=code,
        ),
    )


@router.post("/signup", response_class=HTMLResponse)
def signup_submit(
    request: Request,
    full_name: str = Form(""),
    email: str = Form(""),
    password: str = Form(""),
    confirm: str = Form(""),
    code: str = Form(""),
    db: Session = Depends(get_db),
):
    business = get_business(db)
    email = email.strip().lower()
    full_name = full_name.strip()
    code = clean_signup_code(code)

    def fail(message: str, status_code: int = 400):
        return templates.TemplateResponse(
            request,
            "signup.html",
            _page(
                request,
                "signup.html",
                business,
                error=message,
                full_name=full_name,
                email=email,
                code=code,
            ),
            status_code=status_code,
        )

    if not business.signup_open:
        return fail("New accounts are closed for this store. Ask the owner to open sign-ups.", 403)
    if email and not EMAIL_RE.match(email):
        return fail("That email address does not look right.")
    if db.scalars(select(User).where(User.email == email)).first() is not None:
        return fail("An account with that email already exists. Sign in instead.")
    if len(password) < MIN_PASSWORD:
        return fail(f"Use at least {MIN_PASSWORD} characters for the password.")
    if password != confirm:
        return fail("The two passwords do not match.")
    # The store code is optional: leave it blank to sign up, or enter the one
    # the owner shared. A non-blank code still has to match.
    expected_code = clean_signup_code(business.signup_code)
    if code and expected_code and code != expected_code:
        return fail(
            "That store code is not right. Leave the field blank to create an account, "
            "or ask the owner for the current code."
        )

    user = User(email=email, password_hash=hash_password(password), full_name=full_name or None)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return fail("An account with that email already exists. Sign in instead.")

    request.session.clear()
    request.session["uid"] = user.id
    return RedirectResponse("/", status_code=303)


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)
