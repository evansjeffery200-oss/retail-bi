import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { formatMoney, formatDate } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getBusiness();
  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) notFound();

  const money = (n: number) => formatMoney(n, business.currencyCode, business.currencyLocale);

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <Link href="/sales" className="text-xs font-medium text-[var(--accent)]">← Sales</Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{sale.reference}</h1>
          <p className="text-sm text-[var(--muted)]">{formatDate(sale.date)} · {sale.paymentMethod}</p>
        </div>
        {sale.customerName ? (
          <p className="mt-1 text-sm text-[var(--muted)]">Customer: {sale.customerName}</p>
        ) : null}
      </header>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Unit cost</th>
              <th className="num">Line total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium">{item.name}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{money(item.unitPrice)}</td>
                <td className="num text-[var(--muted)]">{money(item.unitCost)}</td>
                <td className="num">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Subtotal</dt><dd>{money(sale.subtotal)}</dd></div>
          {sale.discountTotal > 0 ? (
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Discount</dt><dd>−{money(sale.discountTotal)}</dd></div>
          ) : null}
          {sale.taxAmount > 0 ? (
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Tax</dt><dd>{money(sale.taxAmount)}</dd></div>
          ) : null}
          <div className="flex justify-between border-t border-[var(--line)] pt-1.5 text-base font-semibold">
            <dt>Total</dt><dd>{money(sale.total)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-[var(--muted)]"><dt>COGS</dt><dd>{money(sale.cogs)}</dd></div>
          <div className="flex justify-between font-medium text-[var(--accent)]"><dt>Gross profit</dt><dd>{money(sale.grossProfit)}</dd></div>
        </dl>
        {sale.notes ? <p className="mt-4 text-sm text-[var(--muted)]">{sale.notes}</p> : null}
      </div>
    </div>
  );
}
