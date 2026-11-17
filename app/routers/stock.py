from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product, StockReceipt, User
from ..money import parse_date, to_minor
from ..security import current_user
from ..stock import stock_rows
from ..templating import ctx, get_business, templates

router = APIRouter()


@router.get("/stock", response_class=HTMLResponse)
def stock_page(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)
    rows = stock_rows(db)
    products = db.scalars(
        select(Product).where(Product.archived.is_(False)).order_by(Product.name)
    ).all()
    receipts = db.scalars(
        select(StockReceipt).order_by(StockReceipt.date.desc(), StockReceipt.id.desc()).limit(15)
    ).all()
    return templates.TemplateResponse(
        request,
        "stock.html",
        ctx(
            request,
            business,
            user,
            active="stock",
            rows=rows,
            products=products,
            receipts=receipts,
            total_value=sum(r.stock_value for r in rows),
        ),
    )


@router.post("/stock/receipts")
def create_receipt(
    product_id: int = Form(0),
    quantity: str = Form("0"),
    unit_cost: str = Form("0"),
    supplier: str = Form(""),
    date: str = Form(""),
    notes: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    product = db.get(Product, product_id) if product_id else None
    qty = int(quantity or 0)
    if product is None or qty == 0:
        return RedirectResponse("/stock", status_code=303)

    cost = to_minor(unit_cost)
    db.add(
        StockReceipt(
            product_id=product.id,
            quantity=qty,
            unit_cost=cost,
            total_cost=cost * qty,
            supplier=supplier.strip() or None,
            date=parse_date(date),
            notes=notes.strip() or None,
        )
    )
    # Keep profit honest: the latest purchase price becomes the product's cost price.
    if cost > 0:
        product.cost_price = cost
    db.commit()
    return RedirectResponse("/stock", status_code=303)


@router.post("/stock/receipts/{receipt_id}/delete")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    receipt = db.get(StockReceipt, receipt_id)
    if receipt is not None:
        db.delete(receipt)
        db.commit()
    return RedirectResponse("/stock", status_code=303)
