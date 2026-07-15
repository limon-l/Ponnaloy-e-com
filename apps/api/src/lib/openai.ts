import OpenAI from "openai";
import { config } from "../config/env";
import prisma from "./prisma";
import { searchProducts } from "./meili";

export const openai = new OpenAI({ apiKey: config.openai.apiKey });

export interface ChatProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  image: string | null;
  category: string;
  brand: string;
  inStock: boolean;
  shortDescription: string | null;
}

export interface ChatToolResult {
  toolCallId: string;
  result: unknown;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function productToChat(p: {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  images: { url: string }[];
  category: { name: string } | null;
  brand: { name: string } | null;
  variants: { stock: number }[];
  shortDescription: string | null;
}): ChatProduct {
  const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    totalSold: p.totalSold,
    image: p.images[0]?.url ?? null,
    category: p.category?.name ?? "Uncategorized",
    brand: p.brand?.name ?? "Unknown",
    inStock: totalStock > 0,
    shortDescription: p.shortDescription,
  };
}

const PRODUCT_INCLUDE = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  category: { select: { name: true } },
  brand: { select: { name: true } },
  variants: { select: { stock: true } },
} as const;

export const chatTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search the product catalog. Returns matching products with prices, ratings, and availability. Use this for any product-related query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search terms (product name, features, keywords)",
          },
          categoryName: {
            type: "string",
            description: "Filter by category name (e.g. 'Electronics', 'Beauty')",
          },
          brandName: {
            type: "string",
            description: "Filter by brand name",
          },
          minPrice: {
            type: "number",
            description: "Minimum price in cents (e.g. 5000 = $50)",
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in cents (e.g. 10000 = $100)",
          },
          minRating: {
            type: "number",
            description: "Minimum average rating (1-5)",
          },
          inStockOnly: {
            type: "boolean",
            description: "Only show products that are in stock",
          },
          sortBy: {
            type: "string",
            enum: ["price", "avgRating", "totalSold", "createdAt", "reviewCount"],
            description: "Sort field",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort direction",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 6, max 10)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description:
        "Get full details of a specific product including specifications, variants, and description. Use when the user asks about a specific product.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Product slug (from URL)",
          },
          name: {
            type: "string",
            description: "Product name to search for if slug is unknown",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "List all product categories with their product counts.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deals",
      description:
        "Get current deals, discounted products, and promotional items.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max results (default 6)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_store_policies",
      description:
        "Get store information including shipping, returns, refunds, and FAQ policies.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["shipping", "returns", "refunds", "faq", "all"],
            description: "Specific policy topic or 'all' for everything",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_products",
      description:
        "Compare two or more products side by side. Provide product names or slugs to compare.",
      parameters: {
        type: "object",
        properties: {
          productNames: {
            type: "array",
            items: { type: "string" },
            description: "List of product names or slugs to compare (2-4 products)",
          },
        },
        required: ["productNames"],
      },
    },
  },
];

function buildStorePolicies(): string {
  return `
## Store Policies

### Shipping
- Free shipping on orders over $150.00
- Standard shipping fee: $15.00
- Ships to: United States
- Delivery time: 3-7 business days (standard), 1-2 business days (express)

### Returns & Refunds
- 30-day return policy from delivery date
- Items must be unused and in original packaging
- Refunds processed within 5-10 business days
- Return shipping paid by customer unless item is defective
- Exchanges available for different sizes/colors

### Payment Methods
- Credit/Debit Cards (Stripe)
- PayPal
- SSLCommerZ
- Razorpay
- Cash on Delivery (COD)
- Bank Transfer

### Contact
- Email: support@ponnaloy.com
- Phone: +1 (555) 123-4567
- Address: 123 Commerce Street, San Francisco, CA 94102
`;
}

export function buildSystemPrompt(
  categories: string[],
  userName?: string | null
): string {
  const greeting = userName ? ` The customer's name is ${userName}.` : "";

  return `You are Marvin, a friendly and knowledgeable shopping assistant for Ponnaloy, an e-commerce store.${greeting}

## Your Role
You help customers discover products, compare options, make informed purchasing decisions, and navigate the store. You are NOT a generic AI assistant — you are a specialized shopping assistant with deep knowledge of this store's catalog.

## Store Overview
- Ponnaloy is a premium e-commerce store
- Product categories: ${categories.join(", ")}
- All prices are in USD

## Critical Rules
1. **NEVER fabricate product information, prices, or availability.** Always use the search_products or get_product_details tools to get real data.
2. **Always use tools** when the user asks about products, prices, availability, comparisons, or recommendations.
3. When recommending products, include specific details: name, price, rating, and availability.
4. If no products match, say so honestly and suggest alternatives.
5. Be conversational, warm, and helpful. Keep replies concise (2-4 sentences) but thorough.
6. You are Marvin, the store's shopping assistant. Never mention being an AI or language model.
7. When showing products, format them clearly with name, price, rating, and a brief note about why they might be good.
8. For follow-up questions about previously shown products, reference the earlier context.
9. End responses with a helpful follow-up suggestion when appropriate.

## Price Format
Always format prices as dollar amounts (e.g. $49.99). Remember, prices in the database are in cents, so divide by 100.

${buildStorePolicies()}
`;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "search_products": {
      const {
        query,
        categoryName,
        brandName,
        minPrice,
        maxPrice,
        minRating,
        inStockOnly,
        sortBy,
        sortOrder,
        limit,
      } = args as {
        query?: string;
        categoryName?: string;
        brandName?: string;
        minPrice?: number;
        maxPrice?: number;
        minRating?: number;
        inStockOnly?: boolean;
        sortBy?: string;
        sortOrder?: string;
        limit?: number;
      };

      // Try Meilisearch first for text search
      if (query) {
        const meiliResult = await searchProducts(query, {
          limit: limit ?? 6,
          sort: sortBy ? [`${sortBy}:${sortOrder ?? "desc"}`] : undefined,
        });

        if (meiliResult.hits.length > 0) {
          const ids = meiliResult.hits.map((h: Record<string, unknown>) => h.id as string);
          const products = await prisma.product.findMany({
            where: {
              id: { in: ids },
              status: "ACTIVE",
              ...(categoryName
                ? { category: { name: { contains: categoryName, mode: "insensitive" } } }
                : {}),
              ...(brandName
                ? { brand: { name: { contains: brandName, mode: "insensitive" } } }
                : {}),
              ...(minPrice !== undefined || maxPrice !== undefined
                ? {
                    price: {
                      ...(minPrice !== undefined ? { gte: minPrice } : {}),
                      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                    },
                  }
                : {}),
              ...(minRating !== undefined ? { avgRating: { gte: minRating } } : {}),
              ...(inStockOnly ? { variants: { some: { stock: { gt: 0 } } } } : {}),
            },
            include: PRODUCT_INCLUDE,
            take: limit ?? 6,
          });

          return products.map(productToChat);
        }
      }

      // Fallback to Prisma search
      const where: Record<string, unknown> = { status: "ACTIVE" };

      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { shortDescription: { contains: query, mode: "insensitive" } },
        ];
      }
      if (categoryName) {
        where.category = { name: { contains: categoryName, mode: "insensitive" } };
      }
      if (brandName) {
        where.brand = { name: { contains: brandName, mode: "insensitive" } };
      }
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) (where.price as Record<string, number>).gte = minPrice;
        if (maxPrice !== undefined) (where.price as Record<string, number>).lte = maxPrice;
      }
      if (minRating !== undefined) where.avgRating = { gte: minRating };
      if (inStockOnly) where.variants = { some: { stock: { gt: 0 } } };

      const orderBy: Record<string, string> = {};
      if (sortBy) {
        orderBy[sortBy] = sortOrder ?? "desc";
      } else {
        orderBy.createdAt = "desc";
      }

      const products = await prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy,
        take: Math.min(limit ?? 6, 10),
      });

      return products.map(productToChat);
    }

    case "get_product_details": {
      const { slug, name } = args as { slug?: string; name?: string };

      let product;
      if (slug) {
        product = await prisma.product.findFirst({
          where: { slug, status: "ACTIVE" },
          include: {
            images: { orderBy: { position: "asc" } },
            variants: true,
            specifications: { orderBy: { position: "asc" } },
            category: { select: { name: true, slug: true } },
            brand: { select: { name: true, slug: true } },
            reviews: {
              where: { isVisible: true },
              select: { rating: true, title: true, comment: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });
      } else if (name) {
        product = await prisma.product.findFirst({
          where: {
            name: { contains: name, mode: "insensitive" },
            status: "ACTIVE",
          },
          include: {
            images: { orderBy: { position: "asc" } },
            variants: true,
            specifications: { orderBy: { position: "asc" } },
            category: { select: { name: true, slug: true } },
            brand: { select: { name: true, slug: true } },
            reviews: {
              where: { isVisible: true },
              select: { rating: true, title: true, comment: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        });
      }

      if (!product) return { error: "Product not found" };

      const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
      return {
        ...productToChat(product),
        images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
        specifications: product.specifications.map((s) => ({
          name: s.name,
          value: s.value,
        })),
        variants: product.variants.map((v) => ({
          name: v.name,
          price: v.price,
          stock: v.stock,
          options: v.options,
        })),
        description: product.description,
        shortDescription: product.shortDescription,
        totalStock,
        reviews: product.reviews,
      };
    }

    case "get_categories": {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: {
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: "asc" },
      });
      return categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        productCount: c._count.products,
      }));
    }

    case "get_deals": {
      const { limit } = (args as { limit?: number }) || {};
      const products = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          compareAtPrice: { not: null },
        },
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit ?? 6, 10),
      });

      // Only return products where compareAtPrice > price (actual deals)
      const deals = products.filter(
        (p) => p.compareAtPrice && p.compareAtPrice > p.price
      );

      return deals.map((p) => ({
        ...productToChat(p),
        discount: p.compareAtPrice
          ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
          : 0,
      }));
    }

    case "get_store_policies": {
      const { topic } = args as { topic: string };
      const policies = buildStorePolicies();
      if (topic === "all") return { policies };
      return { policies, topic };
    }

    case "compare_products": {
      const { productNames } = args as { productNames: string[] };
      const products = await Promise.all(
        productNames.map(async (nameOrSlug) => {
          // Try slug first
          let product = await prisma.product.findFirst({
            where: { slug: nameOrSlug, status: "ACTIVE" },
            include: {
              images: { orderBy: { position: "asc" }, take: 1 },
              variants: true,
              specifications: { orderBy: { position: "asc" } },
              category: { select: { name: true } },
              brand: { select: { name: true } },
            },
          });

          if (!product) {
            product = await prisma.product.findFirst({
              where: {
                name: { contains: nameOrSlug, mode: "insensitive" },
                status: "ACTIVE",
              },
              include: {
                images: { orderBy: { position: "asc" }, take: 1 },
                variants: true,
                specifications: { orderBy: { position: "asc" } },
                category: { select: { name: true } },
                brand: { select: { name: true } },
              },
            });
          }

          if (!product) return null;

          const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
          return {
            ...productToChat(product),
            specifications: product.specifications.map((s) => ({
              name: s.name,
              value: s.value,
            })),
            totalStock,
          };
        })
      );

      return products.filter(Boolean);
    }

    default:
      return { error: "Unknown tool" };
  }
}
