import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getBusiness } from "@/lib/business";
import { toMinor } from "@/lib/money";

type IncomingItem = {
  productId?: string | null;
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string;
};

type Payload = {
  date?: string;
  paymentMethod?: string;
  customerName?: string;
  notes?: string;
  discountTotal?: number | string;
  items?: IncomingItem[];
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((i) => {
      const quantity = Math.trunc(Number(i.quantity));
      const unitPrice = toMinor(i.unitPrice ?? 0);
      return {
        productId: i.productId || null,
        name: String(i.name ?? "").trim(),
        quantity,
        unitPrice,
      };
    })
    .filter((i) => i.quantity > 0 && i.name.length > 0);

  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one item with a quantity." }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId).filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, costPrice: true } })
    : [];
  const costMap = new Map(products.map((p) => [p.id, p.costPrice]));

  const business = await getBusiness();
  const lines = items.map((i) => {
    const unitCost = i.productId ? costMap.get(i.productId) ?? 0 : 0;
    return { ...i, unitCost, lineTotal: i.unitPrice * i.quantity };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discountTotal = Math.min(toMinor(body.discountTotal ?? 0), subtotal);
  const taxable = subtotal - discountTotal;
  const taxAmount =
    business.taxEnabled && business.taxRate > 0
      ? Math.round((taxable * business.taxRate) / 100)
      : 0;
  const cogs = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0);
  const total = taxable + taxAmount;
  const grossProfit = taxable - cogs;

  const saleDate = body.date ? new Date(body.date) : new Date();
  const base = `S-${saleDate.getFullYear().toString().slice(2)}${String(saleDate.getMonth() + 1).padStart(2, "0")}${String(
    saleDate.getDate(),
  ).padStart(2, "0")}`;
  const todayCount = await prisma.sale.count({ where: { reference: { startsWith: base } } });
  let reference = `${base}-${String(todayCount + 1).padStart(3, "0")}`;
  let attempt = 0;
  while (await prisma.sale.findUnique({ where: { reference } })) {
    attempt += 1;
    reference = `${base}-${String(todayCount + 1 + attempt).padStart(3, "0")}`;
  }

  const sale = await prisma.sale.create({
    data: {
      reference,
      date: saleDate,
      paymentMethod: body.paymentMethod || "Cash",
      customerName: body.customerName?.trim() || null,
      notes: body.notes?.trim() || null,
      subtotal,
      discountTotal,
      taxAmount,
      total,
      cogs,
      grossProfit,
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          unitCost: l.unitCost,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, id: sale.id, reference: sale.reference });
}
