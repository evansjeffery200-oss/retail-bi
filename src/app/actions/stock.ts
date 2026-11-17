"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { toMinor } from "@/lib/money";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function createReceipt(fd: FormData) {
  await requireSession();
  const productId = str(fd, "productId");
  const quantity = Number.parseInt(str(fd, "quantity") || "0", 10);
  if (!productId || !Number.isFinite(quantity) || quantity === 0) return;

  const unitCost = toMinor(str(fd, "unitCost"));
  const rawDate = str(fd, "date");
  const date = rawDate ? new Date(rawDate) : new Date();

  await prisma.stockReceipt.create({
    data: {
      productId,
      quantity,
      unitCost,
      totalCost: unitCost * quantity,
      supplier: str(fd, "supplier") || null,
      notes: str(fd, "notes") || null,
      date,
    },
  });

  // Keep the latest purchase price as the product's cost price.
  if (unitCost > 0) {
    await prisma.product.update({ where: { id: productId }, data: { costPrice: unitCost } });
  }

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function deleteReceipt(fd: FormData) {
  await requireSession();
  const id = str(fd, "id");
  if (!id) return;
  await prisma.stockReceipt.delete({ where: { id } });
  revalidatePath("/stock");
  revalidatePath("/");
}
