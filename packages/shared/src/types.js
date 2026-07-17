export var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UserRole || (UserRole = {}));
export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["PROCESSING"] = "PROCESSING";
    OrderStatus["SHIPPED"] = "SHIPPED";
    OrderStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["RETURNED"] = "RETURNED";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (OrderStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["SUCCEEDED"] = "SUCCEEDED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["PARTIALLY_REFUNDED"] = "PARTIALLY_REFUNDED";
})(PaymentStatus || (PaymentStatus = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["STRIPE"] = "STRIPE";
    PaymentMethod["PAYPAL"] = "PAYPAL";
    PaymentMethod["SSLCOMMERZ"] = "SSLCOMMERZ";
    PaymentMethod["RAZORPAY"] = "RAZORPAY";
    PaymentMethod["COD"] = "COD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
})(PaymentMethod || (PaymentMethod = {}));
export var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "PERCENTAGE";
    DiscountType["FIXED"] = "FIXED";
    DiscountType["FREE_SHIPPING"] = "FREE_SHIPPING";
})(DiscountType || (DiscountType = {}));
export var CouponStatus;
(function (CouponStatus) {
    CouponStatus["ACTIVE"] = "ACTIVE";
    CouponStatus["INACTIVE"] = "INACTIVE";
    CouponStatus["EXPIRED"] = "EXPIRED";
})(CouponStatus || (CouponStatus = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER"] = "ORDER";
    NotificationType["PAYMENT"] = "PAYMENT";
    NotificationType["SHIPPING"] = "SHIPPING";
    NotificationType["REFUND"] = "REFUND";
    NotificationType["PROMOTION"] = "PROMOTION";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (NotificationType = {}));
export var BannerPosition;
(function (BannerPosition) {
    BannerPosition["HERO"] = "HERO";
    BannerPosition["SIDEBAR"] = "SIDEBAR";
    BannerPosition["PROMO"] = "PROMO";
})(BannerPosition || (BannerPosition = {}));
//# sourceMappingURL=types.js.map