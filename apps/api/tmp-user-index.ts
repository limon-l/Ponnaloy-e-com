import prisma from "./src/lib/prisma";

async function main() {
  const indexes = await prisma.$runCommandRaw({ listIndexes: "User" });
  console.log("indexes", JSON.stringify(indexes, null, 2));
  const nullClerk = await prisma.user.count({ where: { clerkId: null } });
  const missingClerk = await prisma.user.count({ where: { clerkId: { isSet: false } } });
  const total = await prisma.user.count();
  console.log({ total, nullClerk, missingClerk });
  const sample = await prisma.user.findMany({ select: { email: true, clerkId: true, role: true }, take: 5 });
  console.log(sample);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
