/**
 * Central permission catalogue for the marketplace.
 *
 * Permissions use the `resource:action:scope` convention:
 *   product:create:own        a seller may create products in their own store
 *   seller:approve:platform   an administrator may approve any seller
 *
 * RBAC decides which actions a role may perform. ABAC (ownership, seller
 * membership, resource status) is enforced in the route handlers and in the
 * seller middleware. Deny-by-default is the rule: anything not listed here is
 * forbidden.
 */

export const PERMISSIONS = {
  // Seller self-service
  SELLER_APPLY: "seller:apply:self",
  SELLER_READ_OWN: "seller:read:own",
  SELLER_UPDATE_OWN: "seller:update:own",
  STOREFRONT_UPDATE_OWN: "storefront:update:own",

  // Seller catalog
  PRODUCT_CREATE_OWN: "product:create:own",
  PRODUCT_READ_OWN: "product:read:own",
  PRODUCT_UPDATE_OWN: "product:update:own",
  PRODUCT_DELETE_OWN: "product:delete:own",

  // Seller operations
  ORDER_READ_ASSIGNED: "order:read:assigned",
  ORDER_FULFILL_ASSIGNED: "order:fulfill:assigned",
  ORDER_CANCEL_ASSIGNED: "order:cancel:assigned",
  CUSTOMER_READ_FULFILLMENT: "customer:read:fulfillment",
  ANALYTICS_READ_OWN: "analytics:read:own",

  // Platform administration
  SELLER_READ_PLATFORM: "seller:read:platform",
  SELLER_APPROVE_PLATFORM: "seller:approve:platform",
  SELLER_SUSPEND_PLATFORM: "seller:suspend:platform",
  SELLER_COMMISSION_PLATFORM: "seller:commission:platform",
  PRODUCT_MODERATE_PLATFORM: "product:moderate:platform",
  PRODUCT_MANAGE_PLATFORM: "product:manage:platform",
  ORDER_READ_PLATFORM: "order:read:platform",
  ORDER_MANAGE_PLATFORM: "order:manage:platform",
  CUSTOMER_READ_PLATFORM: "customer:read:platform",
  CUSTOMER_MANAGE_PLATFORM: "customer:manage:platform",
  ANALYTICS_READ_PLATFORM: "analytics:read:platform",
  FINANCE_MANAGE_PLATFORM: "finance:manage:platform",
  SETTINGS_MANAGE_PLATFORM: "settings:manage:platform",
  ADMIN_MANAGE_PLATFORM: "admin:manage:platform",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const CUSTOMER_PERMISSIONS = new Set<Permission>([PERMISSIONS.SELLER_APPLY]);

const SELLER_PERMISSIONS = new Set<Permission>([
  PERMISSIONS.SELLER_APPLY,
  PERMISSIONS.SELLER_READ_OWN,
  PERMISSIONS.SELLER_UPDATE_OWN,
  PERMISSIONS.STOREFRONT_UPDATE_OWN,
  PERMISSIONS.PRODUCT_CREATE_OWN,
  PERMISSIONS.PRODUCT_READ_OWN,
  PERMISSIONS.PRODUCT_UPDATE_OWN,
  PERMISSIONS.PRODUCT_DELETE_OWN,
  PERMISSIONS.ORDER_READ_ASSIGNED,
  PERMISSIONS.ORDER_FULFILL_ASSIGNED,
  PERMISSIONS.ORDER_CANCEL_ASSIGNED,
  PERMISSIONS.CUSTOMER_READ_FULFILLMENT,
  PERMISSIONS.ANALYTICS_READ_OWN,
]);

const ADMIN_PERMISSIONS = new Set<Permission>([
  PERMISSIONS.SELLER_READ_PLATFORM,
  PERMISSIONS.SELLER_APPROVE_PLATFORM,
  PERMISSIONS.SELLER_SUSPEND_PLATFORM,
  PERMISSIONS.SELLER_COMMISSION_PLATFORM,
  PERMISSIONS.PRODUCT_MODERATE_PLATFORM,
  PERMISSIONS.PRODUCT_MANAGE_PLATFORM,
  PERMISSIONS.ORDER_READ_PLATFORM,
  PERMISSIONS.ORDER_MANAGE_PLATFORM,
  PERMISSIONS.CUSTOMER_READ_PLATFORM,
  PERMISSIONS.CUSTOMER_MANAGE_PLATFORM,
  PERMISSIONS.ANALYTICS_READ_PLATFORM,
  PERMISSIONS.FINANCE_MANAGE_PLATFORM,
  PERMISSIONS.SETTINGS_MANAGE_PLATFORM,
]);

const SUPER_ADMIN_PERMISSIONS = new Set<Permission>([
  ...CUSTOMER_PERMISSIONS,
  ...SELLER_PERMISSIONS,
  ...ADMIN_PERMISSIONS,
  PERMISSIONS.ADMIN_MANAGE_PLATFORM,
]);

const ROLE_PERMISSIONS: Record<string, ReadonlySet<Permission>> = {
  CUSTOMER: CUSTOMER_PERMISSIONS,
  SELLER: SELLER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
};

export function roleHasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Seller staff roles. OWNER has every seller permission; MANAGER can run the
 * store but cannot change privileged organization settings; STAFF is limited
 * to catalog stock and fulfillment work.
 */
const SELLER_MEMBER_PERMISSIONS: Record<string, ReadonlySet<Permission>> = {
  OWNER: SELLER_PERMISSIONS,
  MANAGER: new Set<Permission>([
    PERMISSIONS.SELLER_READ_OWN,
    PERMISSIONS.STOREFRONT_UPDATE_OWN,
    PERMISSIONS.PRODUCT_CREATE_OWN,
    PERMISSIONS.PRODUCT_READ_OWN,
    PERMISSIONS.PRODUCT_UPDATE_OWN,
    PERMISSIONS.PRODUCT_DELETE_OWN,
    PERMISSIONS.ORDER_READ_ASSIGNED,
    PERMISSIONS.ORDER_FULFILL_ASSIGNED,
    PERMISSIONS.ORDER_CANCEL_ASSIGNED,
    PERMISSIONS.CUSTOMER_READ_FULFILLMENT,
    PERMISSIONS.ANALYTICS_READ_OWN,
  ]),
  STAFF: new Set<Permission>([
    PERMISSIONS.SELLER_READ_OWN,
    PERMISSIONS.PRODUCT_READ_OWN,
    PERMISSIONS.PRODUCT_UPDATE_OWN,
    PERMISSIONS.ORDER_READ_ASSIGNED,
    PERMISSIONS.ORDER_FULFILL_ASSIGNED,
    PERMISSIONS.CUSTOMER_READ_FULFILLMENT,
  ]),
};

export function sellerMemberHasPermission(
  memberRole: string | undefined | null,
  permission: Permission
): boolean {
  if (!memberRole) return false;
  return SELLER_MEMBER_PERMISSIONS[memberRole]?.has(permission) ?? false;
}
