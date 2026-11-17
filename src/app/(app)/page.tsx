import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { getStockRows, isLowStock } from "@/lib/stock";
import { formatMoney, formatDate } from "@/lib/money";

export const dynamic = "force-dynamic";

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-[var(--accent)]" : tone === "bad" ? "text-[var(--danger)]" : "text-[var(--ink)]";
  return (
    <div className="card p-4">
      <p className="label mb-1">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const business = await getBusiness();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start7 = new Date(startToday);
  start7.setDate(start7.getDate() - 6);

  const [today, month, monthExpenses, topItems, stock, recentSales, weekSales] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: startToday } },
      _sum: { total: true, grossProfit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { date: { gte: startMonth } },
      _sum: { total: true, grossProfit: true, cogs: true },
      _count: true,
    }),
    prisma.expense.aggregate({ where: { date: { gte: startMonth } }, _sum: { amount: true } }),
    prisma.saleItem.groupBy({
      by: ["name"],
      where: { sale: { date: { gte: startMonth } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    getStockRows(),
    prisma.sale.findMany({ orderBy: { date: "desc" }, take: 6 }),
    prisma.sale.findMany({
      where: { date: { gte: start7 } },
      select: { date: true, total: true },
    }),
  ]);

  const money = (n: number) => formatMoney(n, business.currencyCode, business.currencyLocale);

  const monthGross = month._sum.grossProfit ?? 0;
  const monthExpense = monthExpenses._sum.amount ?? 0;
  const net = monthGross - monthExpense;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start7);
    d.setDate(d.getDate() + i);
    const dayTotal = weekSales
      .filter((s) => {
        const sd = new Date(s.date);
        return (
          sd.getFullYear() === d.getFullYear() &&
          sd.getMonth() === d.getMonth() &&
          sd.getDate() === d.getDate()
        );
      })
      .reduce((sum, s) => sum + s.total, 0);
    return { label: d.toLocaleDateString("en-GB", { weekday: "short" }), total: dayTotal };
  });
  const peak = Math.max(...days.map((d) => d.total), 1);

  const lowStock = stock.filter(isLowStock);
  const stockValue = stock.reduce((sum, r) => sum + r.stockValue, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sales/new" className="btn btn-primary">New sale</Link>
          <Link href="/expenses" className="btn btn-ghost">Log expense</Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Sales today" value={money(today._sum.total ?? 0)} sub={`${today._count} ${today._count === 1 ? "transaction" : "transactions"}`} />
        <Kpi
          label="Sales this month"
          value={money(month._sum.total ?? 0)}
          sub={`${month._count} ${month._count === 1 ? "transaction" : "transactions"}`}
        />
        <Kpi label="Gross profit (month)" value={money(monthGross)} sub={`COGS ${money(month._sum.cogs ?? 0)}`} tone="good" />
        <Kpi
          label="Net after expenses"
          value={money(net)}
          sub={`Expenses ${money(monthExpense)}`}
          tone={net >= 0 ? "good" : "bad"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Last 7 days</h2>
            <p className="text-xs text-[var(--muted)]">
              Peak {money(peak)} · Stock on hand {money(stockValue)}
            </p>
          </div>
          <div className="flex h-40 items-end gap-2">
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-[var(--accent)]"
                    style={{ height: `${Math.max((d.total / peak) * 100, d.total > 0 ? 6 : 2)}%`, opacity: d.total > 0 ? 1 : 0.15 }}
                    title={money(d.total)}
                  />
                </div>
                <span className="text-[11px] text-[var(--muted)]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Top sellers this month</h2>
          {topItems.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No sales recorded yet this month.</p>
          ) : (
            <ul className="space-y-2.5">
              {topItems.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 text-[var(--muted)]">
                    {item._sum.quantity ?? 0} × · {money(item._sum.lineTotal ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <h2 className="text-sm font-semibold">Low stock</h2>
            <Link href="/stock" className="text-xs font-medium text-[var(--accent)]">Manage stock</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[var(--muted)]">Nothing at or below its reorder level.</p>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">In stock</th>
                  <th className="num">Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 6).map((row) => (
                  <tr key={row.productId}>
                    <td className="font-medium">{row.name}</td>
                    <td className="num text-[var(--warn)]">{row.currentStock}</td>
                    <td className="num">{row.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent sales</h2>
            <Link href="/sales" className="text-xs font-medium text-[var(--accent)]">All sales</Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[var(--muted)]">No sales yet. Start with “New sale”.</p>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-medium">{sale.reference}</td>
                    <td className="text-[var(--muted)]">{formatDate(sale.date)}</td>
                    <td className="num">{money(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
