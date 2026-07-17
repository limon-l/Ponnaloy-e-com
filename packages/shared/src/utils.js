export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
export function formatCurrency(amount, currency = "USD") {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(amount / 100);
}
export function formatPrice(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}
export function calculateDiscount(price, compareAtPrice) {
    if (!compareAtPrice || compareAtPrice <= price)
        return 0;
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
export function generateOrderNumber() {
    const date = new Date();
    const prefix = "PN";
    const timestamp = date.getFullYear().toString().slice(-2) +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}-${random}`;
}
export function truncate(str, length) {
    if (str.length <= length)
        return str;
    return str.slice(0, length - 3) + "...";
}
export function getInitials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}
export function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
//# sourceMappingURL=utils.js.map