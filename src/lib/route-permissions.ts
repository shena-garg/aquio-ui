/**
 * Maps route prefixes to required permissions.
 * Routes not listed here are accessible to all authenticated users.
 * Entries are ordered longest-prefix-first for matching.
 */

interface RoutePermission {
  path: string;
  permissions: string[];
}

const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Purchase Orders
  { path: "/purchase-orders/create", permissions: ["purchase-order.add"] },
  { path: "/purchase-orders", permissions: ["purchase-order.view"] },

  // Sales Orders
  { path: "/sales-orders/create", permissions: ["sales-order.add"] },
  { path: "/sales-orders", permissions: ["sales-order.view"] },

  // Products
  { path: "/products/new", permissions: ["product.add"] },
  { path: "/products", permissions: ["product.view"] },

  // Categories (including subcategories)
  { path: "/categories/new", permissions: ["category.add"] },
  { path: "/categories", permissions: ["category.view"] },

  // Partners
  { path: "/partners/new", permissions: ["vendor.add"] },
  { path: "/partners", permissions: ["vendor.view"] },

  // Sourcing
  { path: "/buy", permissions: ["auction-buy.view"] },
  { path: "/sell", permissions: ["auction-sale.view"] },
];

/**
 * Returns the required permissions for a given pathname.
 * Uses longest-prefix matching. Returns empty array if no permissions required.
 */
export function getRequiredPermissions(pathname: string): string[] {
  for (const route of ROUTE_PERMISSIONS) {
    if (pathname === route.path || pathname.startsWith(route.path + "/")) {
      return route.permissions;
    }
  }
  return [];
}
