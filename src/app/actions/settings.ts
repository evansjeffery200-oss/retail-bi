"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getBusiness } from "@/lib/business";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function saveBusiness(fd: FormData) {
  await requireSession();
  const business = await getBusiness();
  const taxRate = Number.parseFloat(str(fd, "taxRate") || "0");

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: str(fd, "name") || "My Store",
      currencyCode: (str(fd, "currencyCode") || "NGN").toUpperCase(),
      currencyLocale: str(fd, "currencyLocale") || "en-NG",
      taxEnabled: str(fd, "taxEnabled") === "on",
      taxRate: Number.isFinite(taxRate) ? taxRate : 0,
    },
  });

  revalidatePath("/", "layout");
}
