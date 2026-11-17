import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { formatMoney } from "@/lib/money";
import { createProduct, archiveProduct } from "@/app/actions/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const business = await getBusiness();
  const products = await prisma.product.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
  });
  const money = (n: number) => formatMoney(n, business.currencyCode, business.currencyLocale);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {products.length} active {products.length === 1 ? "product" : "products"}
        </p>
      </header>

      <form action={createProduct} className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Add a product</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required className="field" placeholder="Rolex Datejust 41" />
          </div>
          <div>
            <label className="label" htmlFor="sku">SKU</label>
            <input id="sku" name="sku" className="field" placeholder="RLX-DJ41" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" name="category" className="field" placeholder="Watches" />
          </div>
          <div>
            <label className="label" htmlFor="supplier">Supplier</label>
            <input id="supplier" name="supplier" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="costPrice">Cost price</label>
            <input id="costPrice" name="costPrice" inputMode="decimal" className="field" placeholder="0.00" />
          </div>
          <div>
            <label className="label" htmlFor="sellingPrice">Selling price</label>
            <input id="sellingPrice" name="sellingPrice" inputMode="decimal" className="field" placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="openingStock">Opening</label>
              <input id="openingStock" name="openingStock" inputMode="numeric" className="field" placeholder="0" />
            </div>
            <div>
              <label className="label" htmlFor="reorderLevel">Reorder</label>
              <input id="reorderLevel" name="reorderLevel" inputMode="numeric" className="field" placeholder="0" />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button type="submit" className="btn btn-primary">Add product</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        {products.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">No products yet. Add your first one above.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="num">Cost</th>
                <th className="num">Price</th>
                <th className="num">Margin</th>
                <th className="num">Opening</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const margin = p.sellingPrice - p.costPrice;
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-[var(--muted)]">{p.sku ?? "—"}</td>
                    <td className="text-[var(--muted)]">{p.category ?? "—"}</td>
                    <td className="num">{money(p.costPrice)}</td>
                    <td className="num">{money(p.sellingPrice)}</td>
                    <td className={`num ${margin >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                      {money(margin)}
                    </td>
                    <td className="num">{p.openingStock}</td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <Link href={`/products/${p.id}`} className="text-xs font-medium text-[var(--accent)]">
                          Edit
                        </Link>
                        <form action={archiveProduct}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]">
                            Archive
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
