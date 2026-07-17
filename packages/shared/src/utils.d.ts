export declare function slugify(text: string): string;
export declare function formatCurrency(amount: number, currency?: string): string;
export declare function formatPrice(cents: number): string;
export declare function calculateDiscount(price: number, compareAtPrice: number): number;
export declare function generateOrderNumber(): string;
export declare function truncate(str: string, length: number): string;
export declare function getInitials(name: string): string;
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=utils.d.ts.map