import secrets

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def new_signup_code(length: int = 8) -> str:
    """Short code that a new account has to know, so sign-ups are not open to the world."""
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def clean_signup_code(raw: str) -> str:
    keep = [ch for ch in (raw or "").upper() if ch.isalnum() or ch == "-"]
    return "".join(keep)[:24]


def _redirect_to_login() -> HTTPException:
    return HTTPException(status_code=status.HTTP_303_SEE_OTHER, headers={"Location": "/login"})


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("uid")
    if not user_id:
        raise _redirect_to_login()
    user = db.get(User, int(user_id))
    if user is None:
        request.session.clear()
        raise _redirect_to_login()
    return user


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """Same as current_user but returns None instead of redirecting, for public pages."""
    user_id = request.session.get("uid")
    if not user_id:
        return None
    user = db.get(User, int(user_id))
    if user is None:
        request.session.clear()
        return None
    return user
