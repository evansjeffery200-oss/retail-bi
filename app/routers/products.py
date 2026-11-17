from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product, User
from ..money import to_minor
from ..security import current_user
from ..templating import ctx, get_business, templates

router = APIRouter()


@router.get("/products", response_class=HTMLResponse)
def products_page(request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)):
    business = get_business(db)
    products = db.scalars(
        select(Product).where(Product.archived.is_(False)).order_by(Product.created_at.desc())
    ).all()
    return templates.TemplateResponse(
        request, "products.html", ctx(request, business, user, active="products", products=products)
    )


@router.post("/products")
def create_product(
    name: str = Form(""),
    sku: str = Form(""),
    category: str = Form(""),
    supplier: str = Form(""),
    cost_price: str = Form("0"),
    selling_price: str = Form("0"),
    opening_stock: str = Form("0"),
    reorder_level: str = Form("0"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    name = name.strip()
    if name:
        db.add(
            Product(
                name=name,
                sku=sku.strip() or None,
                category=category.strip() or None,
                supplier=supplier.strip() or None,
                cost_price=to_minor(cost_price),
                selling_price=to_minor(selling_price),
                opening_stock=int(opening_stock or 0),
                reorder_level=int(reorder_level or 0),
            )
        )
        db.commit()
    return RedirectResponse("/products", status_code=303)


@router.get("/products/{product_id}/edit", response_class=HTMLResponse)
def edit_product_page(
    product_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    business = get_business(db)
    product = db.get(Product, product_id)
    if product is None:
        return RedirectResponse("/products", status_code=303)
    return templates.TemplateResponse(
        request,
        "product_edit.html",
        ctx(request, business, user, active="products", product=product),
    )


@router.post("/products/{product_id}")
def update_product(
    product_id: int,
    name: str = Form(""),
    sku: str = Form(""),
    category: str = Form(""),
    supplier: str = Form(""),
    cost_price: str = Form("0"),
    selling_price: str = Form("0"),
    opening_stock: str = Form("0"),
    reorder_level: str = Form("0"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    product = db.get(Product, product_id)
    if product is not None:
        product.name = name.strip() or product.name
        product.sku = sku.strip() or None
        product.category = category.strip() or None
        product.supplier = supplier.strip() or None
        product.cost_price = to_minor(cost_price)
        product.selling_price = to_minor(selling_price)
        product.opening_stock = int(opening_stock or 0)
        product.reorder_level = int(reorder_level or 0)
        db.commit()
    return RedirectResponse("/products", status_code=303)


@router.post("/products/{product_id}/archive")
def archive_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    product = db.get(Product, product_id)
    if product is not None:
        product.archived = True
        db.commit()
    return RedirectResponse("/products", status_code=303)
