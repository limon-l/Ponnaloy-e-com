export declare const SITE_NAME = "Ponnaloy";
export declare const SITE_DESCRIPTION = "Premium shopping experience";
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const PRODUCT_CATEGORIES: readonly ["Electronics", "Clothing", "Home & Living", "Books", "Sports", "Beauty", "Accessories", "Toys", "Automotive", "Health"];
export declare const ORDER_STATUSES: readonly ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"];
export declare const PAYMENT_METHODS: readonly ["STRIPE", "PAYPAL", "SSLCOMMERZ", "RAZORPAY", "COD", "BANK_TRANSFER"];
export declare const FREE_SHIPPING_THRESHOLD = 15000;
export declare const DEFAULT_SHIPPING_FEE = 1500;
export declare const TAX_RATE = 0.08;
export declare const CACHE_TTL: {
    readonly SHORT: 60;
    readonly MEDIUM: 300;
    readonly LONG: 3600;
    readonly DAY: 86400;
};
export declare const CACHE_KEYS: {
    readonly PRODUCTS: "products";
    readonly PRODUCT: "product";
    readonly CATEGORIES: "categories";
    readonly BRANDS: "brands";
    readonly HOMEPAGE: "homepage";
    readonly FEATURED: "featured";
    readonly TRENDING: "trending";
    readonly DEALS: "deals";
};
export declare const STORE_INFO: {
    readonly name: "Ponnaloy";
    readonly email: "support@ponnaloy.com";
    readonly phone: "+1 (555) 123-4567";
    readonly address: {
        readonly street: "123 Commerce Street";
        readonly city: "San Francisco";
        readonly state: "CA";
        readonly zip: "94102";
        readonly country: "US";
    };
};
//# sourceMappingURL=constants.d.ts.map