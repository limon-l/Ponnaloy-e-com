import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const productFilterSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
  isNewArrival: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  ...paginationSchema.shape,
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().optional(),
  price: z.number().int().min(0),
  compareAtPrice: z.number().int().min(0).optional(),
  costPrice: z.number().int().min(0).optional(),
  barcode: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  weight: z.number().min(0).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        position: z.number().int().min(0).default(0),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        price: z.number().int().min(0),
        stock: z.number().int().min(0).default(0),
        image: z.string().optional(),
        options: z.record(z.string()).default({}),
      })
    )
    .optional(),
  specifications: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
        position: z.number().int().min(0).default(0),
      })
    )
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createOrderSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(1),
    phone: z.string().optional(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().default("US"),
  }),
  billingAddress: z
    .object({
      fullName: z.string().min(1),
      phone: z.string().optional(),
      addressLine1: z.string().min(1),
      addressLine2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
      country: z.string().default("US"),
    })
    .optional(),
  paymentMethod: z.enum([
    "STRIPE",
    "PAYPAL",
    "SSLCOMMERZ",
    "RAZORPAY",
    "COD",
    "BANK_TRANSFER",
  ]),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const createAddressSchema = z.object({
  label: z.string().max(50).default("Home"),
  fullName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zipCode: z.string().min(1).max(20),
  country: z.string().max(100).default("US"),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().max(255).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  discountValue: z.number().int().min(0),
  minOrderAmount: z.number().int().min(0).optional(),
  maxDiscountAmount: z.number().int().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  description: z.string().max(500).optional(),
  image: z.string().url().optional(),
  isActive: z.boolean().default(true),
  parentId: z.string().optional(),
  position: z.number().int().min(0).default(0),
});

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  logo: z.string().url().optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export const createBannerSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional(),
  image: z.string().url(),
  link: z.string().url().optional(),
  position: z.enum(["HERO", "SIDEBAR", "PROMO"]).default("HERO"),
  isActive: z.boolean().default(true),
  positionOrder: z.number().int().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
