from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Business(Base):
    __tablename__ = "business"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), default="My Store")
    currency_code: Mapped[str] = mapped_column(String(8), default="NGN")
    currency_locale: Mapped[str] = mapped_column(String(16), default="en-NG")
    tax_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    sku: Mapped[str | None] = mapped_column(String(60), nullable=True)
    category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    supplier: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cost_price: Mapped[int] = mapped_column(Integer, default=0)
    selling_price: Mapped[int] = mapped_column(Integer, default=0)
    opening_stock: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    receipts: Mapped[list["StockReceipt"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class StockReceipt(Base):
    __tablename__ = "stock_receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[int] = mapped_column(Integer, default=0)
    total_cost: Mapped[int] = mapped_column(Integer, default=0)
    supplier: Mapped[str | None] = mapped_column(String(120), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    product: Mapped[Product] = relationship(back_populates="receipts")


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    payment_method: Mapped[str] = mapped_column(String(40), default="Cash")
    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtotal: Mapped[int] = mapped_column(Integer, default=0)
    discount_total: Mapped[int] = mapped_column(Integer, default=0)
    tax_amount: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    cogs: Mapped[int] = mapped_column(Integer, default=0)
    gross_profit: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[int] = mapped_column(Integer, default=0)
    line_total: Mapped[int] = mapped_column(Integer)

    sale: Mapped[Sale] = relationship(back_populates="items")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    description: Mapped[str] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    amount: Mapped[int] = mapped_column(Integer)
    date: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    payee: Mapped[str | None] = mapped_column(String(120), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(40), default="Cash")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
