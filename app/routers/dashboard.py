from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Expense, Sale, SaleItem, User
from ..security import current_user, optional_user
from ..stock import stock_rows
from ..templating import ctx, get_business, templates

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    if user is None:
        return RedirectResponse("/welcome", status_code=303)
    business = get_business(db)
    now = datetime.now()
    start_today = datetime.combine(date.today(), time.min)
    start_month = datetime(now.year, now.month, 1)
    start_week = start_today - timedelta(days=6)

    today_count, today_total = db.execute(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0)).where(Sale.date >= start_today)
    ).one()

    month_count, month_total, month_cogs, month_gross = db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total), 0),
            func.coalesce(func.sum(Sale.cogs), 0),
            func.coalesce(func.sum(Sale.gross_profit), 0),
        ).where(Sale.date >= start_month)
    ).one()

    month_expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.date >= start_month)
    ) or 0

    top_items = db.execute(
        select(
            SaleItem.name,
            func.coalesce(func.sum(SaleItem.quantity), 0).label("qty"),
            func.coalesce(func.sum(SaleItem.line_total), 0).label("revenue"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.date >= start_month)
        .group_by(SaleItem.name)
        .order_by(func.sum(SaleItem.line_total).desc())
        .limit(5)
    ).all()

    recent_sales = db.scalars(select(Sale).order_by(Sale.date.desc(), Sale.id.desc()).limit(6)).all()

    week_sales = db.execute(
        select(Sale.date, Sale.total).where(Sale.date >= start_week)
    ).all()
    days = []
    for offset in range(7):
        day = (start_week + timedelta(days=offset)).date()
        total = sum(row.total for row in week_sales if row.date.date() == day)
        days.append({"label": day.strftime("%a"), "total": total})
    peak = max([d["total"] for d in days] + [1])

    rows = stock_rows(db)
    low_stock = [r for r in rows if r.is_low]
    stock_value = sum(r.stock_value for r in rows)

    return templates.TemplateResponse(
        request,
        "dashboard.html",
        ctx(
            request,
            business,
            user,
            active="dashboard",
            now=now,
            today_count=today_count,
            today_total=today_total,
            month_count=month_count,
            month_total=month_total,
            month_cogs=month_cogs,
            month_gross=month_gross,
            month_expenses=month_expenses,
            net=month_gross - month_expenses,
            top_items=top_items,
            recent_sales=recent_sales,
            days=days,
            peak=peak,
            low_stock=low_stock,
            stock_value=stock_value,
        ),
    )
