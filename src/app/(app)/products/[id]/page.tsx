import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { toMajor } from "@/lib/money";
import { updateProduct } from "@/app/actions/products";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getBusiness();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link href="/products" className="text-xs font-medium text-[var(--accent)]">← Products</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit product</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Prices in {business.currencyCode}</p>
      </header>

      <form action={updateProduct} className="card p-5 space-y-3">
        <input type="hidden" name="id" value={product.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={product.name} required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="sku">SKU</label>
            <input id="sku" name="sku" defaultValue={product.sku ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" name="category" defaultValue={product.category ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="supplier">Supplier</label>
            <input id="supplier" name="supplier" defaultValue={product.supplier ?? ""} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="costPrice">Cost price</label>
            <input id="costPrice" name="costPrice" defaultValue={toMajor(product.costPrice)} inputMode="decimal" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="sellingPrice">Selling price</label>
            <input id="sellingPrice" name="sellingPrice" defaultValue={toMajor(product.sellingPrice)} inputMode="decimal" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="openingStock">Opening stock</label>
            <input id="openingStock" name="openingStock" defaultValue={product.openingStock} inputMode="numeric" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="reorderLevel">Reorder level</label>
            <input id="reorderLevel" name="reorderLevel" defaultValue={product.reorderLevel} inputMode="numeric" className="field" />
          </div>
        </div>
        <div className="pt-1">
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </div>
  );
}
