import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { formatMoney, formatDate } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const business = await getBusiness();
  const sales = await prisma.sale.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: { _count: { select: { items: true } } },
  });
  const money = (n: number) => formatMoney(n, business.currencyCode, business.currencyLocale);
  const total = sales.reduce((s, x) => s + x.total, 0);
  const profit = sales.reduce((s, x) => s + x.grossProfit, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Last {sales.length} · {money(total)} revenue · {money(profit)} gross profit
          </p>
        </div>
        <Link href="/sales/new" className="btn btn-primary">New sale</Link>
      </header>

      <div className="card overflow-x-auto">
        {sales.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">No sales yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th className="num">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">
                    <Link href={`/sales/${s.id}`} className="hover:text-[var(--accent)]">{s.reference}</Link>
                  </td>
                  <td className="text-[var(--muted)]">{formatDate(s.date)}</td>
                  <td className="text-[var(--muted)]">{s.customerName ?? "—"}</td>
                  <td className="text-[var(--muted)]">{s.paymentMethod}</td>
                  <td className="num">{s._count.items}</td>
                  <td className="num font-medium">{money(s.total)}</td>
                  <td className="num text-[var(--accent)]">{money(s.grossProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
