import { prisma } from "./prisma";

export type BusinessSettings = {
  id: string;
  name: string;
  currencyCode: string;
  currencyLocale: string;
  taxEnabled: boolean;
  taxRate: number;
};

export async function getBusiness(): Promise<BusinessSettings> {
  const existing = await prisma.business.findFirst({ orderBy: { id: "asc" } });
  if (existing) return existing;
  return prisma.business.create({
    data: {
      name: process.env.BUSINESS_NAME ?? "My Store",
      currencyCode: process.env.CURRENCY_CODE ?? "NGN",
      currencyLocale: process.env.CURRENCY_LOCALE ?? "en-NG",
    },
  });
}
