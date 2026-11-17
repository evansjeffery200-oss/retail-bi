from datetime import datetime

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Expense, User
from ..money import parse_date, to_minor
from ..security import current_user
from ..templating import ctx, get_business, templates

router = APIRouter()

CATEGORIES = ["Rent", "Salaries", "Transport", "Utilities", "Marketing", "Supplies", "Other"]


@router.get("/expenses", response_class=HTMLResponse)
def expenses_page(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)
    now = datetime.now()
    start_month = datetime(now.year, now.month, 1)

    expenses = db.scalars(select(Expense).order_by(Expense.date.desc(), Expense.id.desc()).limit(100)).all()
    month_total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.date >= start_month)
    ) or 0

    by_category: dict[str, int] = {}
    for expense in expenses:
        key = expense.category or "Other"
        by_category[key] = by_category.get(key, 0) + expense.amount

    return templates.TemplateResponse(
        request,
        "expenses.html",
        ctx(
            request,
            business,
            user,
            active="expenses",
            expenses=expenses,
            month_total=month_total,
            categories=CATEGORIES,
            by_category=sorted(by_category.items(), key=lambda item: item[1], reverse=True),
        ),
    )


@router.post("/expenses")
def create_expense(
    description: str = Form(""),
    amount: str = Form("0"),
    date: str = Form(""),
    category: str = Form("Other"),
    payee: str = Form(""),
    payment_method: str = Form("Cash"),
    notes: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if description.strip():
        db.add(
            Expense(
                description=description.strip(),
                amount=to_minor(amount),
                date=parse_date(date),
                category=category.strip() or None,
                payee=payee.strip() or None,
                payment_method=payment_method.strip() or "Cash",
                notes=notes.strip() or None,
            )
        )
        db.commit()
    return RedirectResponse("/expenses", status_code=303)


@router.post("/expenses/{expense_id}/delete")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    expense = db.get(Expense, expense_id)
    if expense is not None:
        db.delete(expense)
        db.commit()
    return RedirectResponse("/expenses", status_code=303)
