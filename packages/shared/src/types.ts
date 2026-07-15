export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
  REFUNDED = "REFUNDED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentMethod {
  STRIPE = "STRIPE",
  PAYPAL = "PAYPAL",
  SSLCOMMERZ = "SSLCOMMERZ",
  RAZORPAY = "RAZORPAY",
  COD = "COD",
  BANK_TRANSFER = "BANK_TRANSFER",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
  FREE_SHIPPING = "FREE_SHIPPING",
}

export enum CouponStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
}

export enum NotificationType {
  ORDER = "ORDER",
  PAYMENT = "PAYMENT",
  SHIPPING = "SHIPPING",
  REFUND = "REFUND",
  PROMOTION = "PROMOTION",
  SYSTEM = "SYSTEM",
}

export enum BannerPosition {
  HERO = "HERO",
  SIDEBAR = "SIDEBAR",
  PROMO = "PROMO",
}

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
