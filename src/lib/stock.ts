import { prisma } from "./prisma";

export type StockRow = {
  productId: string;
  name: string;
  sku: string | null;
  category: string | null;
  openingStock: number;
  received: number;
  sold: number;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
};

export async function getStockRows(): Promise<StockRow[]> {
  const [products, receipts, sold] = await Promise.all([
    prisma.product.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.stockReceipt.groupBy({ by: ["productId"], _sum: { quantity: true } }),
    prisma.saleItem.groupBy({ by: ["productId"], _sum: { quantity: true } }),
  ]);

  const receivedMap = new Map(receipts.map((r) => [r.productId, r._sum.quantity ?? 0]));
  const soldMap = new Map(sold.map((r) => [r.productId ?? "", r._sum.quantity ?? 0]));

  return products.map((p) => {
    const received = receivedMap.get(p.id) ?? 0;
    const soldQty = soldMap.get(p.id) ?? 0;
    const currentStock = p.openingStock + received - soldQty;
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      openingStock: p.openingStock,
      received,
      sold: soldQty,
      currentStock,
      reorderLevel: p.reorderLevel,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stockValue: currentStock * p.costPrice,
    };
  });
}

export function isLowStock(row: { currentStock: number; reorderLevel: number }): boolean {
  return row.reorderLevel > 0 && row.currentStock <= row.reorderLevel;
}
