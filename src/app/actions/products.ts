"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { toMinor } from "@/lib/money";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function int(fd: FormData, key: string): number {
  const n = Number.parseInt(str(fd, key) || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export async function createProduct(fd: FormData) {
  await requireSession();
  const name = str(fd, "name");
  if (!name) return;

  await prisma.product.create({
    data: {
      name,
      sku: str(fd, "sku") || null,
      category: str(fd, "category") || null,
      supplier: str(fd, "supplier") || null,
      costPrice: toMinor(str(fd, "costPrice")),
      sellingPrice: toMinor(str(fd, "sellingPrice")),
      openingStock: int(fd, "openingStock"),
      reorderLevel: int(fd, "reorderLevel"),
    },
  });

  revalidatePath("/products");
  revalidatePath("/stock");
  revalidatePath("/");
}

export async function updateProduct(fd: FormData) {
  await requireSession();
  const id = str(fd, "id");
  if (!id) return;

  await prisma.product.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      sku: str(fd, "sku") || null,
      category: str(fd, "category") || null,
      supplier: str(fd, "supplier") || null,
      costPrice: toMinor(str(fd, "costPrice")),
      sellingPrice: toMinor(str(fd, "sellingPrice")),
      openingStock: int(fd, "openingStock"),
      reorderLevel: int(fd, "reorderLevel"),
    },
  });

  revalidatePath("/products");
  revalidatePath("/stock");
  redirect("/products");
}

export async function archiveProduct(fd: FormData) {
  await requireSession();
  const id = str(fd, "id");
  if (!id) return;
  await prisma.product.update({ where: { id }, data: { archived: true } });
  revalidatePath("/products");
  revalidatePath("/stock");
}
