import prisma from "./src/lib/prisma";

async function main() {
  const [products, inStock, sellers, categories, brands, sellerUsers] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { stock: { gt: 0 } } }),
    prisma.sellerOrganization.findMany({
      select: { id: true, name: true, slug: true, status: true, commissionRate: true, ownerId: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.brand.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.user.findMany({
      where: { role: { in: ["SELLER", "ADMIN", "SUPER_ADMIN"] } },
      select: { id: true, email: true, role: true },
      take: 10,
    }),
  ]);

  console.log(JSON.stringify({ products, inStock, sellers, categories, brands, sellerUsers }, null, 2));

  const byStock = await prisma.product.groupBy({
    by: ["sellerId"],
    _count: { _all: true },
    _sum: { stock: true },
  });
  console.log("bySeller", JSON.stringify(byStock, null, 2));

  const sample = await prisma.product.findMany({
    select: { name: true, stock: true, status: true, sellerId: true, moderationStatus: true },
    take: 8,
  });
  console.log("sample", JSON.stringify(sample, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
