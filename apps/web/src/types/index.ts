export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  barcode?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  weight?: number | null;
  avgRating: number;
  reviewCount: number;
  totalSold: number;
  createdAt: string;
  updatedAt: string;
  categoryId?: string | null;
  brandId?: string | null;
  images: ProductImage[];
  variants?: ProductVariant[];
  specifications?: ProductSpec[];
  category?: Category | null;
  brand?: Brand | null;
  reviews?: Review[];
  isWishlisted?: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  stock: number;
  image?: string | null;
  options: Record<string, string>;
}

export interface ProductSpec {
  id: string;
  name: string;
  value: string;
  position: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  children?: Category[];
  _count?: { products: number };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  website?: string | null;
  isActive: boolean;
  _count?: { products: number };
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  products?: ProductCollection[];
}

export interface ProductCollection {
  id: string;
  position: number;
  product: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments?: Payment[];
  shipments?: Shipment[];
  statusHistory?: OrderStatusLog[];
  user?: User;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId: string;
  variantId?: string | null;
  product?: Product;
}

export interface OrderStatusLog {
  id: string;
  status: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  transactionId?: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  method?: string | null;
  status: string;
  estimatedDelivery?: string | null;
  actualDelivery?: string | null;
}

export interface Review {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  images: string[];
  isVerified: boolean;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
}

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface Cart {
  id: string;
  items: CartItem[];
  coupon?: CartCoupon | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  itemCount: number;
}

export interface CartItem {
  id: string;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
}

export interface CartCoupon {
  code: string;
  discount: number;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  link?: string | null;
  position: "HERO" | "SIDEBAR" | "PROMO";
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "REFUNDED";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentMethod =
  | "STRIPE"
  | "PAYPAL"
  | "SSLCOMMERZ"
  | "RAZORPAY"
  | "COD"
  | "BANK_TRANSFER";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminStats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
}

// ── Chat Types ──────────────────────────────────────────────

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
  discount?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ChatProduct[];
  comparison?: ChatProduct[];
  suggestions?: string[];
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
}

export type ChatStreamEventType =
  | "text"
  | "products"
  | "comparison"
  | "suggestions"
  | "done"
  | "error";
