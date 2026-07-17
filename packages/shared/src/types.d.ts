export declare enum UserRole {
    CUSTOMER = "CUSTOMER",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    PROCESSING = "PROCESSING",
    SHIPPED = "SHIPPED",
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED",
    RETURNED = "RETURNED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
}
export declare enum PaymentMethod {
    STRIPE = "STRIPE",
    PAYPAL = "PAYPAL",
    SSLCOMMERZ = "SSLCOMMERZ",
    RAZORPAY = "RAZORPAY",
    COD = "COD",
    BANK_TRANSFER = "BANK_TRANSFER"
}
export declare enum DiscountType {
    PERCENTAGE = "PERCENTAGE",
    FIXED = "FIXED",
    FREE_SHIPPING = "FREE_SHIPPING"
}
export declare enum CouponStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    EXPIRED = "EXPIRED"
}
export declare enum NotificationType {
    ORDER = "ORDER",
    PAYMENT = "PAYMENT",
    SHIPPING = "SHIPPING",
    REFUND = "REFUND",
    PROMOTION = "PROMOTION",
    SYSTEM = "SYSTEM"
}
export declare enum BannerPosition {
    HERO = "HERO",
    SIDEBAR = "SIDEBAR",
    PROMO = "PROMO"
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
//# sourceMappingURL=types.d.ts.map