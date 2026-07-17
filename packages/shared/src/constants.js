export const SITE_NAME = "Ponnaloy";
export const SITE_DESCRIPTION = "Premium shopping experience";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const PRODUCT_CATEGORIES = [
    "Electronics",
    "Clothing",
    "Home & Living",
    "Books",
    "Sports",
    "Beauty",
    "Accessories",
    "Toys",
    "Automotive",
    "Health",
];
export const ORDER_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
];
export const PAYMENT_METHODS = [
    "STRIPE",
    "PAYPAL",
    "SSLCOMMERZ",
    "RAZORPAY",
    "COD",
    "BANK_TRANSFER",
];
export const FREE_SHIPPING_THRESHOLD = 15000;
export const DEFAULT_SHIPPING_FEE = 1500;
export const TAX_RATE = 0.08;
export const CACHE_TTL = {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 3600,
    DAY: 86400,
};
export const CACHE_KEYS = {
    PRODUCTS: "products",
    PRODUCT: "product",
    CATEGORIES: "categories",
    BRANDS: "brands",
    HOMEPAGE: "homepage",
    FEATURED: "featured",
    TRENDING: "trending",
    DEALS: "deals",
};
export const STORE_INFO = {
    name: "Ponnaloy",
    email: "support@ponnaloy.com",
    phone: "+1 (555) 123-4567",
    address: {
        street: "123 Commerce Street",
        city: "San Francisco",
        state: "CA",
        zip: "94102",
        country: "US",
    },
};
//# sourceMappingURL=constants.js.map