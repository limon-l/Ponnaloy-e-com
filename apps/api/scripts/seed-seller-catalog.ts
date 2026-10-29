/**
 * Seeds a demo marketplace seller with an in-stock catalogue.
 *
 * Safe to re-run: the seller, owner account and products are upserted by their
 * stable slug/email, and existing stock is never reduced.
 *
 *   pnpm --filter @ponnaloy/api seed:seller
 */
import crypto from "node:crypto";
import prisma from "../src/lib/prisma";

const SELLER_EMAIL = "seller@ponnaloy.local";
const SELLER_PASSWORD = "PonnaloySeller#2026";
const SELLER_SLUG = "ponnaloy-home-studio";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

interface SeedProduct {
  slug: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  category: string;
  brand?: string;
  shortDescription: string;
  description: string;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  specs: Array<{ name: string; value: string }>;
}

const PRODUCTS: SeedProduct[] = [
  {
    slug: "artisan-ceramic-mug-set",
    name: "Artisan Ceramic Mug Set (4 Pack)",
    sku: "PHS-HOME-001",
    price: 4800,
    compareAtPrice: 6200,
    stock: 42,
    category: "home-living",
    brand: "homecraft",
    shortDescription: "Hand-glazed stoneware mugs, dishwasher and microwave safe",
    description:
      "Four hand-glazed stoneware mugs made in small batches. Each mug holds 350 ml, keeps drinks warm and is safe for the dishwasher and microwave. Slight glaze variation is part of the finish.",
    featured: true,
    trending: true,
    newArrival: true,
    specs: [
      { name: "Material", value: "Glazed stoneware" },
      { name: "Capacity", value: "350 ml per mug" },
      { name: "Care", value: "Dishwasher and microwave safe" },
    ],
  },
  {
    slug: "linen-blend-throw-blanket",
    name: "Linen-Blend Throw Blanket",
    sku: "PHS-HOME-002",
    price: 6900,
    compareAtPrice: 8500,
    stock: 28,
    category: "home-living",
    brand: "homecraft",
    shortDescription: "Breathable 130 × 170 cm throw in a soft linen-cotton weave",
    description:
      "A mid-weight throw woven from linen and cotton. Breathable in summer, warm in winter, and finished with a hand-knotted fringe. Machine washable on a gentle cycle.",
    featured: true,
    newArrival: true,
    specs: [
      { name: "Size", value: "130 × 170 cm" },
      { name: "Material", value: "55% linen, 45% cotton" },
      { name: "Care", value: "Machine wash cold, gentle" },
    ],
  },
  {
    slug: "organic-cotton-everyday-hoodie",
    name: "Organic Cotton Everyday Hoodie",
    sku: "PHS-FASH-001",
    price: 7400,
    compareAtPrice: 9200,
    stock: 55,
    category: "fashion",
    brand: "urbanedge",
    shortDescription: "Heavyweight 400 gsm organic cotton with a brushed interior",
    description:
      "A relaxed-fit hoodie in 400 gsm organic cotton. Double-stitched seams, a lined hood and a brushed interior that stays soft after repeated washing. Unisex sizing.",
    featured: true,
    trending: true,
    specs: [
      { name: "Fabric", value: "100% organic cotton, 400 gsm" },
      { name: "Fit", value: "Relaxed unisex" },
      { name: "Care", value: "Machine wash cold, tumble dry low" },
    ],
  },
  {
    slug: "merino-wool-crew-socks",
    name: "Merino Wool Crew Socks (3 Pack)",
    sku: "PHS-FASH-002",
    price: 3200,
    stock: 90,
    category: "fashion",
    brand: "urbanedge",
    shortDescription: "Temperature-regulating merino blend with cushioned soles",
    description:
      "Three pairs of crew socks knitted from a merino wool blend. Merino regulates temperature and resists odour, while the cushioned sole adds comfort for long days.",
    newArrival: true,
    specs: [
      { name: "Material", value: "70% merino wool, 28% nylon, 2% elastane" },
      { name: "Pack", value: "3 pairs" },
      { name: "Care", value: "Machine wash cool, line dry" },
    ],
  },
  {
    slug: "insulated-stainless-steel-bottle",
    name: "Insulated Stainless Steel Bottle 750 ml",
    sku: "PHS-SPRT-001",
    price: 3600,
    compareAtPrice: 4500,
    stock: 64,
    category: "sports-outdoors",
    brand: "peakfit",
    shortDescription: "Double-wall vacuum insulation, 24 h cold / 12 h hot",
    description:
      "A 750 ml double-wall vacuum bottle in food-grade stainless steel. Keeps drinks cold for 24 hours or hot for 12, with a leak-proof lid and a powder-coated grip finish.",
    featured: true,
    trending: true,
    specs: [
      { name: "Capacity", value: "750 ml" },
      { name: "Material", value: "18/8 stainless steel" },
      { name: "Insulation", value: "24 h cold / 12 h hot" },
    ],
  },
  {
    slug: "cork-yoga-mat",
    name: "Natural Cork Yoga Mat",
    sku: "PHS-SPRT-002",
    price: 5800,
    stock: 31,
    category: "sports-outdoors",
    brand: "peakfit",
    shortDescription: "Non-slip cork surface on a natural rubber base",
    description:
      "A 4 mm mat with a natural cork top that grips better as it absorbs moisture, backed by sustainable rubber. Includes a cotton carry strap.",
    newArrival: true,
    specs: [
      { name: "Size", value: "183 × 61 cm" },
      { name: "Thickness", value: "4 mm" },
      { name: "Material", value: "Cork and natural rubber" },
    ],
  },
  {
    slug: "wireless-charging-pad-15w",
    name: "15 W Wireless Charging Pad",
    sku: "PHS-ELEC-001",
    price: 2900,
    compareAtPrice: 3900,
    stock: 73,
    category: "electronics",
    brand: "technova",
    shortDescription: "Qi-certified 15 W fast charging with foreign-object detection",
    description:
      "A Qi-certified wireless charging pad delivering up to 15 W to compatible phones. Foreign-object detection and over-temperature protection keep charging safe overnight.",
    trending: true,
    specs: [
      { name: "Output", value: "Up to 15 W" },
      { name: "Standard", value: "Qi certified" },
      { name: "Cable", value: "1.2 m USB-C included" },
    ],
  },
  {
    slug: "braided-usb-c-cable-2m",
    name: "Braided USB-C Cable 2 m",
    sku: "PHS-ELEC-002",
    price: 1800,
    stock: 120,
    category: "electronics",
    brand: "technova",
    shortDescription: "100 W PD charging and 480 Mbps data transfer",
    description:
      "A 2 metre braided USB-C to USB-C cable rated for 100 W power delivery and 480 Mbps data. Reinforced strain relief is tested to 20,000 bends.",
    newArrival: true,
    specs: [
      { name: "Length", value: "2 m" },
      { name: "Power", value: "Up to 100 W PD" },
      { name: "Data", value: "480 Mbps" },
    ],
  },
  {
    slug: "shea-butter-body-cream",
    name: "Whipped Shea Butter Body Cream",
    sku: "PHS-BEAU-001",
    price: 2400,
    compareAtPrice: 3000,
    stock: 85,
    category: "beauty-health",
    brand: "glowup",
    shortDescription: "Fragrance-free 250 ml cream for dry and sensitive skin",
    description:
      "A fragrance-free body cream built on unrefined shea butter and glycerin. Absorbs without a greasy residue and is suitable for dry, sensitive skin. 250 ml jar.",
    featured: true,
    specs: [
      { name: "Volume", value: "250 ml" },
      { name: "Key ingredients", value: "Shea butter, glycerin, vitamin E" },
      { name: "Scent", value: "Fragrance free" },
    ],
  },
  {
    slug: "daily-mineral-sunscreen-spf50",
    name: "Daily Mineral Sunscreen SPF 50",
    sku: "PHS-BEAU-002",
    price: 2800,
    stock: 60,
    category: "beauty-health",
    brand: "glowup",
    shortDescription: "Reef-safe zinc oxide formula with no white cast",
    description:
      "A lightweight mineral sunscreen with SPF 50 broad-spectrum protection. Non-nano zinc oxide provides reef-safe coverage that blends without a heavy white cast.",
    trending: true,
    specs: [
      { name: "Protection", value: "SPF 50, broad spectrum" },
      { name: "Filter", value: "Non-nano zinc oxide" },
      { name: "Volume", value: "50 ml" },
    ],
  },
  {
    slug: "single-origin-coffee-beans-1kg",
    name: "Single-Origin Coffee Beans 1 kg",
    sku: "PHS-FOOD-001",
    price: 4200,
    compareAtPrice: 5200,
    stock: 48,
    category: "food-beverages",
    brand: "naturebite",
    shortDescription: "Medium roast washed Arabica, roasted to order",
    description:
      "A 1 kg bag of washed Arabica from a single estate, roasted to order in small batches. Notes of cocoa, orange peel and brown sugar. Whole bean.",
    featured: true,
    trending: true,
    newArrival: true,
    specs: [
      { name: "Weight", value: "1 kg" },
      { name: "Roast", value: "Medium" },
      { name: "Process", value: "Washed" },
    ],
  },
  {
    slug: "handcrafted-dot-grid-notebook",
    name: "Handcrafted Dot-Grid Notebook A5",
    sku: "PHS-BOOK-001",
    price: 2200,
    stock: 95,
    category: "books-stationery",
    brand: "pageturner",
    shortDescription: "160 gsm fountain-pen-friendly paper, lay-flat binding",
    description:
      "An A5 dot-grid notebook with 160 pages of 160 gsm paper that handles fountain ink without bleed-through. Sewn lay-flat binding and a hard linen cover.",
    newArrival: true,
    specs: [
      { name: "Size", value: "A5 (148 × 210 mm)" },
      { name: "Paper", value: "160 gsm, dot grid" },
      { name: "Pages", value: "160" },
    ],
  },
  {
    slug: "wooden-logic-puzzle-set",
    name: "Wooden Logic Puzzle Set",
    sku: "PHS-TOYS-001",
    price: 3400,
    compareAtPrice: 4100,
    stock: 37,
    category: "toys-games",
    brand: "playzone",
    shortDescription: "Six solid-wood brain teasers with a cotton storage bag",
    description:
      "Six classic brain teasers cut from solid beech wood and sanded smooth. Recommended for ages 8 and up, with a printed solution card and cotton storage bag.",
    specs: [
      { name: "Pieces", value: "6 puzzles" },
      { name: "Material", value: "Solid beech wood" },
      { name: "Age", value: "8 years and up" },
    ],
  },
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: SELLER_EMAIL },
    update: { role: "SELLER", emailVerified: true, isActive: true },
    create: {
      email: SELLER_EMAIL,
      firstName: "Ponnaloy",
      lastName: "Studio",
      role: "SELLER",
      emailVerified: true,
      passwordHash: hashPassword(SELLER_PASSWORD),
    },
    select: { id: true, email: true },
  });

  const seller = await prisma.sellerOrganization.upsert({
    where: { slug: SELLER_SLUG },
    update: { status: "APPROVED", ownerId: owner.id },
    create: {
      name: "Ponnaloy Home Studio",
      slug: SELLER_SLUG,
      description:
        "Everyday home, apparel and wellness essentials made in small batches and shipped by the studio.",
      logo: "https://picsum.photos/seed/ponnaloy-studio-logo/200/200",
      banner: "https://picsum.photos/seed/ponnaloy-studio-banner/1200/300",
      status: "APPROVED",
      approvedAt: new Date(),
      commissionRate: 1000,
      supportEmail: SELLER_EMAIL,
      ownerId: owner.id,
      policies: {
        shipping: "Dispatched within 2 business days.",
        returns: "30-day returns on unused items.",
      },
    },
  });

  const existingMembership = await prisma.sellerMembership.findFirst({
    where: { sellerId: seller.id, userId: owner.id },
  });
  if (existingMembership) {
    await prisma.sellerMembership.update({
      where: { id: existingMembership.id },
      data: { role: "OWNER", isActive: true },
    });
  } else {
    await prisma.sellerMembership.create({
      data: { sellerId: seller.id, userId: owner.id, role: "OWNER" },
    });
  }

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const brands = await prisma.brand.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const brandBySlug = new Map(brands.map((b) => [b.slug, b.id]));

  let created = 0;
  let updated = 0;

  for (const item of PRODUCTS) {
    const categoryId = categoryBySlug.get(item.category) ?? null;
    const brandId = item.brand ? brandBySlug.get(item.brand) ?? null : null;
    const data = {
      name: item.name,
      sku: item.sku,
      price: item.price,
      compareAtPrice: item.compareAtPrice ?? null,
      stock: item.stock,
      status: "ACTIVE" as const,
      moderationStatus: "APPROVED" as const,
      sellerId: seller.id,
      categoryId,
      brandId,
      shortDescription: item.shortDescription,
      description: item.description,
      isFeatured: Boolean(item.featured),
      isTrending: Boolean(item.trending),
      isNewArrival: Boolean(item.newArrival),
      weight: 500,
      weightUnit: "g",
      images: {
        create: [
          {
            url: `https://picsum.photos/seed/${item.slug}-1/800/800`,
            alt: item.name,
            position: 0,
          },
          {
            url: `https://picsum.photos/seed/${item.slug}-2/800/800`,
            alt: `${item.name} alternate view`,
            position: 1,
          },
        ],
      },
      specifications: {
        create: item.specs.map((spec, index) => ({
          name: spec.name,
          value: spec.value,
          position: index,
        })),
      },
    };

    const existing = await prisma.product.findUnique({
      where: { slug: item.slug },
      select: { id: true },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          images: undefined,
          specifications: undefined,
          // Never reduce inventory when the script is re-run.
          stock: { set: item.stock },
        },
      });
      updated += 1;
    } else {
      await prisma.product.create({ data: { ...data, slug: item.slug } });
      created += 1;
    }
  }

  // Restore availability to legacy platform products that were seeded with no
  // inventory. Their `stock` field is absent in MongoDB, so the filter is done
  // in application code: Prisma reads absent numbers as 0, while a `lte: 0`
  // query would not match the missing field.
  const platformProducts = await prisma.product.findMany({
    where: {
      OR: [{ sellerId: { isSet: false } }, { sellerId: null }],
      status: "ACTIVE",
    },
    select: { id: true, stock: true },
  });
  const restockable = platformProducts.filter((product) => product.stock <= 0);
  for (const [index, product] of restockable.entries()) {
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: 20 + (index % 6) * 5 },
    });
  }

  const totals = await prisma.product.aggregate({
    where: { stock: { gt: 0 } },
    _count: { _all: true },
  });

  console.log(
    JSON.stringify(
      {
        seller: { id: seller.id, name: seller.name, slug: seller.slug, status: seller.status },
        owner: { id: owner.id, email: owner.email, password: SELLER_PASSWORD },
        products: { created, updated },
        restockedPlatformProducts: restockable.length,
        inStockTotal: totals._count._all,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
