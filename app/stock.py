from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Product, SaleItem, StockReceipt


@dataclass
class StockRow:
    product_id: int
    name: str
    sku: str | None
    category: str | None
    opening_stock: int
    received: int
    sold: int
    current_stock: int
    reorder_level: int
    cost_price: int
    selling_price: int

    @property
    def stock_value(self) -> int:
        return self.current_stock * self.cost_price

    @property
    def is_low(self) -> bool:
        return self.reorder_level > 0 and self.current_stock <= self.reorder_level


def stock_rows(db: Session) -> list[StockRow]:
    products = db.scalars(select(Product).where(Product.archived.is_(False)).order_by(Product.name)).all()

    received = dict(
        db.execute(
            select(StockReceipt.product_id, func.coalesce(func.sum(StockReceipt.quantity), 0)).group_by(
                StockReceipt.product_id
            )
        ).all()
    )
    sold = dict(
        db.execute(
            select(SaleItem.product_id, func.coalesce(func.sum(SaleItem.quantity), 0))
            .where(SaleItem.product_id.is_not(None))
            .group_by(SaleItem.product_id)
        ).all()
    )

    rows: list[StockRow] = []
    for product in products:
        got = int(received.get(product.id, 0) or 0)
        left = int(sold.get(product.id, 0) or 0)
        rows.append(
            StockRow(
                product_id=product.id,
                name=product.name,
                sku=product.sku,
                category=product.category,
                opening_stock=product.opening_stock,
                received=got,
                sold=left,
                current_stock=product.opening_stock + got - left,
                reorder_level=product.reorder_level,
                cost_price=product.cost_price,
                selling_price=product.selling_price,
            )
        )
    return rows


def stock_map(db: Session) -> dict[int, int]:
    return {row.product_id: row.current_stock for row in stock_rows(db)}
