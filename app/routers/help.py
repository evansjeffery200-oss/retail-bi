from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import current_user, require_admin
from ..templating import ctx, get_business, templates

router = APIRouter()

SUPPORT_EMAIL_DEFAULT = "evansjeffery200@gmail.com"


def support_details(business) -> tuple[str, str]:
    email = (business.support_email or "").strip() or SUPPORT_EMAIL_DEFAULT
    phone = (business.support_phone or "").strip()
    return email, phone


@router.get("/help", response_class=HTMLResponse)
def help_page(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    business = get_business(db)
    email, phone = support_details(business)
    return templates.TemplateResponse(
        request,
        "help.html",
        ctx(
            request,
            business,
            user,
            active="help",
            support_email=email,
            support_phone=phone,
            show_tour=not user.tour_done,
        ),
    )


@router.post("/help/tour")
def replay_tour(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Turn the first-run tour back on, so anyone can walk through the app again."""
    user.tour_done = False
    db.commit()
    return RedirectResponse("/?tour=1", status_code=303)


@router.post("/onboarding/done")
def tour_done(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Called by the tour when it finishes or is skipped, so it only greets a new account once."""
    if not user.tour_done:
        user.tour_done = True
        db.commit()
    return JSONResponse({"ok": True})


@router.post("/admin/contact")
def save_contact(
    support_email: str = Form(""),
    support_phone: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    business = get_business(db)
    business.support_email = support_email.strip()[:255] or SUPPORT_EMAIL_DEFAULT
    business.support_phone = support_phone.strip()[:40] or None
    db.commit()
    return RedirectResponse("/admin?notice=Support+details+saved", status_code=303)
