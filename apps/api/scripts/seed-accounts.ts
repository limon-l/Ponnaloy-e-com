import dotenv from "dotenv";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// Resolve the root file independently of the shell's working directory.
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
const prisma = new PrismaClient();

async function main() {
  for (const [prefix, role] of [["ADMIN", "SUPER_ADMIN"], ["DEMO_USER", "CUSTOMER"], ["DEMO_SELLER", "SELLER"]] as const) {
    const email = process.env[`${prefix}_EMAIL`]?.trim().toLowerCase();
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email || !password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error(`${prefix}_EMAIL and a strong ${prefix}_PASSWORD are required`);
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`${role}: ${email} already exists; credentials preserved`);
      continue;
    }
    const salt = crypto.randomBytes(16).toString("hex");
    await prisma.user.create({ data: {
      email, role, firstName: prefix === "ADMIN" ? "Administrator" : "Demo",
      lastName: role === "SELLER" ? "Seller" : "User", emailVerified: true,
      passwordHash: `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`,
    } });
    console.log(`Created ${role}: ${email}`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
