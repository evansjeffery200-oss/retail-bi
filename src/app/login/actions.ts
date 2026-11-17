"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Wrong email or password." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Wrong email or password." };

  await createSession(user.id, user.email);
  redirect("/");
}
