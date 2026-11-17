import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.INITIAL_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.INITIAL_PASSWORD ?? "";

  if (!email || !password) {
    console.log("Set INITIAL_EMAIL and INITIAL_PASSWORD before seeding. Skipping user creation.");
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });
    console.log(`Login ready for ${user.email}`);
  }

  const business = await prisma.business.findFirst();
  if (!business) {
    await prisma.business.create({
      data: {
        name: process.env.BUSINESS_NAME ?? "My Store",
        currencyCode: process.env.CURRENCY_CODE ?? "NGN",
        currencyLocale: process.env.CURRENCY_LOCALE ?? "en-NG",
      },
    });
    console.log("Business settings created.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
