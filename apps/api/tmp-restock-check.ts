import prisma from "./src/lib/prisma";
async function main() {
  const rows = await prisma.product.findMany({ where: { OR: [{ sellerId: { isSet: false } }, { sellerId: null }] }, select: { name: true, stock: true, status: true }, take: 5 });
  console.log(rows);
  const raw = await prisma.$runCommandRaw({ aggregate: "Product", pipeline: [{ $match: { sellerId: { $exists: false } } }, { $limit: 5 }, { $project: { name: 1, stock: 1, status: 1 } }], cursor: {} });
  console.log(JSON.stringify(raw, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
