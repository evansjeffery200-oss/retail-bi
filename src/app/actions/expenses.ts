"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { toMinor } from "@/lib/money";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function createExpense(fd: FormData) {
  await requireSession();
  const description = str(fd, "description");
  if (!description) return;
  const rawDate = str(fd, "date");

  await prisma.expense.create({
    data: {
      description,
      category: str(fd, "category") || null,
      amount: toMinor(str(fd, "amount")),
      date: rawDate ? new Date(rawDate) : new Date(),
      payee: str(fd, "payee") || null,
      paymentMethod: str(fd, "paymentMethod") || "Cash",
      notes: str(fd, "notes") || null,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function deleteExpense(fd: FormData) {
  await requireSession();
  const id = str(fd, "id");
  if (!id) return;
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  revalidatePath("/");
}
