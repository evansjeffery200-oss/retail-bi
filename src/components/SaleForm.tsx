"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sellingPrice: number;
  currentStock: number;
};

type Line = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};

let counter = 0;
const nextKey = () => `line-${++counter}`;

export default function SaleForm({
  products,
  currencyCode,
  currencyLocale,
  taxEnabled,
  taxRate,
  today,
}: {
  products: Product[];
  currencyCode: string;
  currencyLocale: string;
  taxEnabled: boolean;
  taxRate: number;
  today: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([
    { key: nextKey(), productId: products[0]?.id ?? "", quantity: "1", unitPrice: products[0] ? String(products[0].sellingPrice / 100) : "" },
  ]);
  const [date, setDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const money = (minor: number) =>
    new Intl.NumberFormat(currencyLocale, { style: "currency", currency: currencyCode }).format(minor / 100);

  const update = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    const first = products[0];
    setLines((prev) => [
      ...prev,
      { key: nextKey(), productId: first?.id ?? "", quantity: "1", unitPrice: first ? String(first.sellingPrice / 100) : "" },
    ]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const onPickProduct = (key: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    update(key, { productId, unitPrice: product ? String(product.sellingPrice / 100) : "" });
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => {
      const q = Number(l.quantity) || 0;
      const p = Math.round((Number(l.unitPrice) || 0) * 100);
      return sum + q * p;
    }, 0);
    const discountMinor = Math.min(Math.round((Number(discount) || 0) * 100), subtotal);
    const taxable = subtotal - discountMinor;
    const tax = taxEnabled && taxRate > 0 ? Math.round((taxable * taxRate) / 100) : 0;
    return { subtotal, discountMinor, tax, total: taxable + tax };
  }, [lines, discount, taxEnabled, taxRate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const items = lines
      .map((l) => {
        const product = products.find((p) => p.id === l.productId);
        return {
          productId: l.productId || null,
          name: product?.name ?? "",
          quantity: Number(l.quantity) || 0,
          unitPrice: Number(l.unitPrice) || 0,
        };
      })
      .filter((i) => i.name && i.quantity > 0);

    if (items.length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          paymentMethod,
          customerName,
          notes,
          discountTotal: Number(discount) || 0,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the sale.");
        setSaving(false);
        return;
      }
      router.push(`/sales/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="payment">Payment</label>
            <select id="payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="field">
              <option>Cash</option>
              <option>Transfer</option>
              <option>Card</option>
              <option>POS</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="customer">Customer</label>
            <input id="customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="field" placeholder="Walk-in" />
          </div>
          <div>
            <label className="label" htmlFor="discount">Discount</label>
            <input id="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" className="field" placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num" style={{ width: 90 }}>Qty</th>
              <th className="num" style={{ width: 140 }}>Unit price</th>
              <th className="num" style={{ width: 120 }}>Line</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              const lineTotal = (Number(line.quantity) || 0) * (Math.round((Number(line.unitPrice) || 0) * 100));
              return (
                <tr key={line.key}>
                  <td>
                    <select
                      value={line.productId}
                      onChange={(e) => onPickProduct(line.key, e.target.value)}
                      className="field"
                    >
                      <option value="">Select a product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.currentStock} in stock)
                        </option>
                      ))}
                    </select>
                    {product && product.currentStock <= 0 ? (
                      <p className="mt-1 text-xs text-[var(--warn)]">No stock recorded for this product.</p>
                    ) : null}
                  </td>
                  <td>
                    <input
                      value={line.quantity}
                      onChange={(e) => update(line.key, { quantity: e.target.value })}
                      inputMode="numeric"
                      className="field num"
                    />
                  </td>
                  <td>
                    <input
                      value={line.unitPrice}
                      onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                      inputMode="decimal"
                      className="field num"
                    />
                  </td>
                  <td className="num">{money(lineTotal)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3">
          <button type="button" onClick={addLine} className="btn btn-ghost">Add line</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="field" />
        </div>
        <div className="card p-5">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Discount</dt><dd>−{money(totals.discountMinor)}</dd></div>
            {totals.tax > 0 ? (
              <div className="flex justify-between"><dt className="text-[var(--muted)]">Tax ({taxRate}%)</dt><dd>{money(totals.tax)}</dd></div>
            ) : null}
            <div className="flex justify-between border-t border-[var(--line)] pt-2 text-base font-semibold">
              <dt>Total</dt><dd>{money(totals.total)}</dd>
            </div>
          </dl>

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <button type="submit" disabled={saving} className="btn btn-primary mt-4 w-full">
            {saving ? "Saving..." : "Save sale"}
          </button>
        </div>
      </div>
    </form>
  );
}
