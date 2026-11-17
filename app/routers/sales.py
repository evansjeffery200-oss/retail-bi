from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product, Sale, SaleItem, User
from ..money import parse_date, to_minor
from ..security import current_user
from ..stock import stock_map
from ..templating import ctx, get_business, templates

router = APIRouter()


class IncomingItem(BaseModel):
    product_id: int | None = None
    name: str = ""
    quantity: float | str | int = 0
    unit_price: float | str | int = 0


class SalePayload(BaseModel):
    date: str | None = None
    payment_method: str = "Cash"
    customer_name: str = ""
    notes: str = ""
    discount_total: float | str | int = 0
    items: list[IncomingItem] = Field(default_factory=list)


@router.get("/sales", response_class=HTMLResponse)
def sales_page(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)
    sales = db.scalars(select(Sale).order_by(Sale.date.desc(), Sale.id.desc()).limit(100)).all()
    total = sum(s.total for s in sales)
    profit = sum(s.gross_profit for s in sales)
    counts = dict(
        db.execute(
            select(SaleItem.sale_id, func.count(SaleItem.id))
            .where(SaleItem.sale_id.in_([s.id for s in sales] or [0]))
            .group_by(SaleItem.sale_id)
        ).all()
    )
    return templates.TemplateResponse(
        request,
        "sales.html",
        ctx(
            request,
            business,
            user,
            active="sales",
            sales=sales,
            total=total,
            profit=profit,
            counts=counts,
        ),
    )


@router.get("/sales/new", response_class=HTMLResponse)
def new_sale_page(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)
    products = db.scalars(
        select(Product).where(Product.archived.is_(False)).order_by(Product.name)
    ).all()
    available = stock_map(db)
    return templates.TemplateResponse(
        request,
        "sale_new.html",
        ctx(
            request,
            business,
            user,
            active="sales",
            products=products,
            available=available,
        ),
    )


@router.get("/sales/{sale_id}", response_class=HTMLResponse)
def sale_detail(
    sale_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    business = get_business(db)
    sale = db.get(Sale, sale_id)
    if sale is None:
        return RedirectResponse("/sales", status_code=303)
    return templates.TemplateResponse(
        request, "sale_detail.html", ctx(request, business, user, active="sales", sale=sale)
    )


@router.post("/api/sales")
def create_sale(payload: SalePayload, db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)

    items = []
    for raw in payload.items:
        quantity = int(float(raw.quantity or 0))
        unit_price = to_minor(raw.unit_price)
        name = (raw.name or "").strip()
        if quantity <= 0 or not name:
            continue
        items.append({"product_id": raw.product_id, "name": name, "quantity": quantity, "unit_price": unit_price})

    if not items:
        raise HTTPException(status_code=400, detail="Add at least one item with a quantity.")

    product_ids = [i["product_id"] for i in items if i["product_id"]]
    costs = {
        p.id: p.cost_price
        for p in db.scalars(select(Product).where(Product.id.in_(product_ids or [0]))).all()
    }

    subtotal = 0
    cogs = 0
    for item in items:
        item["unit_cost"] = costs.get(item["product_id"], 0) if item["product_id"] else 0
        item["line_total"] = item["unit_price"] * item["quantity"]
        subtotal += item["line_total"]
        cogs += item["unit_cost"] * item["quantity"]

    discount_total = min(to_minor(payload.discount_total), subtotal)
    taxable = subtotal - discount_total
    tax_amount = int(round(taxable * business.tax_rate / 100)) if business.tax_enabled and business.tax_rate else 0
    total = taxable + tax_amount
    gross_profit = taxable - cogs

    sale_date = parse_date(payload.date)
    prefix = f"S-{sale_date.strftime('%y%m%d')}"
    existing = db.scalar(select(func.count(Sale.id)).where(Sale.reference.like(f"{prefix}-%"))) or 0
    sequence = existing + 1
    reference = f"{prefix}-{sequence:03d}"
    while db.scalar(select(Sale.id).where(Sale.reference == reference)) is not None:
        sequence += 1
        reference = f"{prefix}-{sequence:03d}"

    sale = Sale(
        reference=reference,
        date=sale_date,
        payment_method=(payload.payment_method or "Cash").strip(),
        customer_name=payload.customer_name.strip() or None,
        notes=payload.notes.strip() or None,
        subtotal=subtotal,
        discount_total=discount_total,
        tax_amount=tax_amount,
        total=total,
        cogs=cogs,
        gross_profit=gross_profit,
    )
    for item in items:
        sale.items.append(
            SaleItem(
                product_id=item["product_id"],
                name=item["name"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                unit_cost=item["unit_cost"],
                line_total=item["line_total"],
            )
        )

    db.add(sale)
    db.commit()
    db.refresh(sale)
    return {"ok": True, "id": sale.id, "reference": sale.reference}
