import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { getStockRows } from "@/lib/stock";
import SaleForm from "@/components/SaleForm";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const business = await getBusiness();
  const [products, stockRows] = await Promise.all([
    prisma.product.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    getStockRows(),
  ]);

  const stockMap = new Map(stockRows.map((r) => [r.productId, r.currentStock]));
  const options = products.map((p) => ({
    id: p.id,
    name: p.name,
    sellingPrice: p.sellingPrice,
    currentStock: stockMap.get(p.id) ?? p.openingStock,
  }));

  return (
    <div className="space-y-6">
      <header>
        <Link href="/sales" className="text-xs font-medium text-[var(--accent)]">← Sales</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New sale</h1>
      </header>

      {options.length === 0 ? (
        <p className="card p-5 text-sm text-[var(--muted)]">
          Add a product first, then you can record sales.
        </p>
      ) : (
        <SaleForm
          products={options}
          currencyCode={business.currencyCode}
          currencyLocale={business.currencyLocale}
          taxEnabled={business.taxEnabled}
          taxRate={business.taxRate}
          today={new Date().toISOString().slice(0, 10)}
        />
      )}
    </div>
  );
}
