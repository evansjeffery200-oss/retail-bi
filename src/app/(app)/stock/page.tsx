import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { getStockRows, isLowStock } from "@/lib/stock";
import { formatMoney, formatDate } from "@/lib/money";
import { createReceipt, deleteReceipt } from "@/app/actions/stock";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const business = await getBusiness();
  const [rows, products, receipts] = await Promise.all([
    getStockRows(),
    prisma.product.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockReceipt.findMany({
      orderBy: { date: "desc" },
      take: 15,
      include: { product: { select: { name: true } } },
    }),
  ]);
  const money = (n: number) => formatMoney(n, business.currencyCode, business.currencyLocale);
  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Opening stock plus receipts minus units sold · {money(totalValue)} on hand at cost
        </p>
      </header>

      {products.length > 0 ? (
        <form action={createReceipt} className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Receive stock</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="label" htmlFor="productId">Product</label>
              <select id="productId" name="productId" required className="field">
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="quantity">Quantity</label>
              <input id="quantity" name="quantity" inputMode="numeric" required className="field" placeholder="10" />
            </div>
            <div>
              <label className="label" htmlFor="unitCost">Unit cost</label>
              <input id="unitCost" name="unitCost" inputMode="decimal" className="field" placeholder="0.00" />
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" name="date" type="date" defaultValue={today} className="field" />
            </div>
            <div className="lg:col-span-3">
              <label className="label" htmlFor="supplier">Supplier</label>
              <input id="supplier" name="supplier" className="field" />
            </div>
            <div className="lg:col-span-2">
              <label className="label" htmlFor="notes">Notes</label>
              <input id="notes" name="notes" className="field" />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" className="btn btn-primary">Add receipt</button>
          </div>
        </form>
      ) : (
        <p className="card p-5 text-sm text-[var(--muted)]">Add a product first, then you can receive stock.</p>
      )}

      <div className="card overflow-x-auto">
        <div className="px-5 py-3.5">
          <h2 className="text-sm font-semibold">Current stock</h2>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[var(--muted)]">Nothing tracked yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Opening</th>
                <th className="num">Received</th>
                <th className="num">Sold</th>
                <th className="num">In stock</th>
                <th className="num">Reorder at</th>
                <th className="num">Value at cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId}>
                  <td className="font-medium">
                    {r.name}
                    {isLowStock(r) ? (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--warn)]">
                        Low
                      </span>
                    ) : null}
                  </td>
                  <td className="num text-[var(--muted)]">{r.openingStock}</td>
                  <td className="num text-[var(--muted)]">{r.received}</td>
                  <td className="num text-[var(--muted)]">{r.sold}</td>
                  <td className={`num font-semibold ${isLowStock(r) ? "text-[var(--warn)]" : ""}`}>{r.currentStock}</td>
                  <td className="num text-[var(--muted)]">{r.reorderLevel || "—"}</td>
                  <td className="num">{money(r.stockValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-x-auto">
        <div className="px-5 py-3.5">
          <h2 className="text-sm font-semibold">Recent receipts</h2>
        </div>
        {receipts.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[var(--muted)]">No stock received yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th className="num">Qty</th>
                <th className="num">Unit cost</th>
                <th className="num">Total</th>
                <th>Supplier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="text-[var(--muted)]">{formatDate(r.date)}</td>
                  <td className="font-medium">{r.product.name}</td>
                  <td className="num">{r.quantity}</td>
                  <td className="num">{money(r.unitCost)}</td>
                  <td className="num">{money(r.totalCost)}</td>
                  <td className="text-[var(--muted)]">{r.supplier ?? "—"}</td>
                  <td>
                    <form action={deleteReceipt} className="flex justify-end">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-[var(--muted)]">
        Receiving stock with a unit cost also updates that product&apos;s cost price, so profit stays accurate.
      </p>
    </div>
  );
}
