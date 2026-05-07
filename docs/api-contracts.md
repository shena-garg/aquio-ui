# API Contracts

All API calls use Axios via `src/lib/api-client.ts` with automatic Bearer token injection. Base URL is configured via `NEXT_PUBLIC_API_BASE_URL`.

---

## Authentication & Profile

**Service:** `src/services/auth.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| POST | `/users/login` | User login | `{ email: string, password: string }` | `{ accessToken: string, user: object }` |
| GET | `/users/my-own` | Get current user profile | — | `User` |
| PATCH | `/users/my-own` | Update profile | `{ name?: string, phoneNumber?: string, countryCode?: string, notificationPreferences?: { overdueDigest: { po: { enabled: boolean }, so: { enabled: boolean } } } }` | `User` |
| PATCH | `/users/change-password` | Change password | `{ oldPassword: string, newPassword: string }` | — |

---

## Purchase Orders

**Service:** `src/services/purchase-orders.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/purchase-orders/list` | List POs with filters | Query: `page, limit, orderType="purchase", status, poNumber, referenceId, supplierReferenceId, receiptStatus, issueDateFrom, issueDateTo, deliveryDateFrom, deliveryDateTo, minDelay, maxDelay` — `minDelay`/`maxDelay` filter by `delayDays` range (Watch=1-2, Warning=3-6, Critical=7+); when `status=delayed` results sort by `delayDays` desc | `PurchaseOrdersResponse { data: PurchaseOrder[], pagination: { total, page, limit }, counts: POStatusCounts }` |
| GET | `/purchase-orders/list` | Export POs as CSV | Query: `format="csv", csvPattern: "basic"|"comprehensive", orderType="purchase", status, ...filters` | `Blob` |
| GET | `/purchase-orders/{id}?comprehensive=true` | Get single PO with full details | — | `PurchaseOrder` |
| PATCH | `/purchase-orders/{id}/cancel` | Cancel PO | `{ cancellationReason: string, cancellationNotes?: string }` | — |
| PATCH | `/purchase-orders/{id}/confirm` | Confirm PO | `{ supplierReferenceId?: string }` (optional) | — |
| PATCH | `/purchase-orders/{id}/forcefully-close-multiple` | Force close products | `{ items: [{ productId: string, variantId: string }] }` | — |
| PATCH | `/purchase-orders/{id}/undo-forcefully-close` | Undo force close | `{ productId: string, variantId: string }` | — |
| PATCH | `/purchase-orders/{id}/csv` | Download receipt CSV | `null` | `Blob` |

---

## Purchase Order Form

**Service:** `src/services/purchaseOrderForm.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/vendor-companies/with-locations` | Get vendors with locations | — | `{ vendorCompanies: VendorCompany[] }` |
| GET | `/organizations/my-own` | Get own org for form | — | `Organization` |
| GET | `/organization-settings/my-own` | Get PO form settings | — | `POFormSettings { generatePOAutomatically, paymentTerms[], defaultTermsAndConditions[] }` |
| GET | `/purchase-orders/{id}?comprehensive=true` | Get order for editing | — | Order data |
| GET | `/products` | Search products | Query: `name` (search term) | `ProductSearchResult[]` |
| POST | `/purchase-orders` | Create order | `CreatePOPayload { orderType: "purchase"|"sales", status, poNumber, issueDate, deliveryDate, paymentTerms, products[], supplier, buyer, biller, ... }` | `{ _id: string }` |
| PUT | `/purchase-orders/{id}` | Update order | Same as create payload | — |

---

## Sales Orders

**Service:** `src/services/sales-orders.ts`

Uses the **same backend endpoints** as Purchase Orders but with `orderType="sales"`.

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/purchase-orders/list` | List SOs | Query: `orderType="sales"`, same filters as PO including `minDelay`/`maxDelay` | `SalesOrdersResponse` |
| GET | `/purchase-orders/list` | Export SOs as CSV | Query: `format="csv", orderType="sales"` | `Blob` |
| GET | `/purchase-orders/{id}?comprehensive=true` | Get single SO | — | `SalesOrder` |
| PATCH | `/purchase-orders/{id}/cancel` | Cancel SO | Same as PO | — |
| PATCH | `/purchase-orders/{id}/confirm` | Confirm SO | Same as PO | — |
| PATCH | `/purchase-orders/{id}/forcefully-close-multiple` | Force close products | Same as PO | — |
| PATCH | `/purchase-orders/{id}/undo-forcefully-close` | Undo force close | Same as PO | — |
| PATCH | `/purchase-orders/{id}/csv` | Download shipment CSV | Same as PO | `Blob` |

---

## Receipts / Shipments

**Called from:** `src/components/purchase-orders/modals/ReceiptFormModal.tsx`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| POST | `/purchase-orders/{orderId}/receipts` | Create receipt/shipment | `{ products: [{ productId, variantId, deliveredQuantity, allowExcess }], deliveryDate, notes, files: [{ id, name }] }` | — |
| PATCH | `/purchase-orders/{orderId}/receipts/{receiptId}` | Update receipt/shipment | Same as create | — |

---

## Products

**Service:** `src/services/products.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/products` | List products | Query: `page, limit, status, name, sku, categoryId, subCategoryId` | `{ products: Product[], totalCount: number }` |
| GET | `/products/{id}` | Get product by ID | — | `Product` (response.data extracted) |
| POST | `/products` | Create product | `CreateProductPayload { name, unitOfMeasurement, categoryId, subCategoryId, hsnCode, gst, description?, termsOfConditions?, files?, variants[] }` | `Product` |
| PATCH | `/products/{id}` | Update product | Same as create | `Product` |
| DELETE | `/products/{id}` | Archive product | — | — |

### Product Analytics

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/purchase-orders/analytics/product-procurement` | Procurement analytics | Query: `productId, variantId, fromDate, toDate` | `{ summary: { totalUnitsOrdered, totalUnitsReceived, totalSpend, avgBuyPrice, poCount, uom, fulfillmentRate, bestPrice, worstPrice, ... }, priceHistory: [], volumeHistory: [], volumeIntelligence: {}, suppliers: [{ supplierId, supplierName, units, avgPrice, minPrice, maxPrice, poCount, avgLeadTimeDays, onTimeRate, totalSpend, ... }], recentPOs: [{ poId, poNumber, supplierName, unitsOrdered, unitsReceived, issueDate, deliveryDate, unitPrice, status, receiptStatus, leadTimeDays, ... }] }` |
| GET | `/purchase-orders/analytics/product-sales` | Sales analytics | Query: `productId, variantId, fromDate, toDate` | `{ summary: { totalUnitsSold, totalUnitsDelivered, totalRevenue, avgSellPrice, soCount, uom, fulfillmentRate, ... }, priceHistory: [], volumeHistory: [], volumeIntelligence: {}, buyers: [{ buyerId, buyerName, units, avgPrice, minPrice, maxPrice, soCount, avgLeadTimeDays, onTimeRate, totalRevenue, ... }], recentSOs: [{ soId, soNumber, buyerName, unitsSold, unitsDelivered, issueDate, deliveryDate, unitPrice, status, receiptStatus, leadTimeDays, ... }] }` |
| GET | `/purchase-orders/analytics/product-margin` | Margin analytics | Query: `productId, variantId, fromDate, toDate` | `{ summary: { avgBuyPrice, avgSellPrice, avgGrossMarginPct, marginTrend, marginTrendPct, currentBuyPrice, currentSellPrice }, waterfall: [{ label, value, type }], marginHistory: [{ month, grossMarginPct }] }` |

---

## Categories & Subcategories

**Service:** `src/services/categories.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/categories` | List all categories | — | `{ categories: Category[] }` |
| GET | `/categories/{id}` | Get category by ID | — | `Category` |
| POST | `/categories` | Create category | `{ name: string }` | — |
| PATCH | `/categories/{id}` | Update category | `{ name: string }` | — |
| POST | `/categories` | Create subcategory | `{ name: string, parentId: string, customAttributes: [{ label, unit }] }` | — |
| GET | `/categories/{id}` | Get subcategory by ID | — | `SubCategory` |
| PATCH | `/categories/{id}` | Update subcategory | `{ name: string, customAttributes: [{ label, unit }] }` | — |

---

## Partners (Vendors)

**Service:** `src/services/partners.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/vendor-companies` | List vendor companies | Query: `page, limit` | `{ vendorCompanies: VendorCompany[], totalCount: number }` |

---

## Users

**Service:** `src/services/users.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/users` | List users | Query: `page, limit, status: "active"|"inactive"` | `{ users: User[], totalCount: number }` |
| GET | `/users/{id}` | Get user by ID | — | `User` |
| POST | `/users` | Create user | `CreateUserPayload { name, email, password, roleId, phoneNumber?, countryCode? }` | — |
| PATCH | `/users/{id}` | Update user | `Partial<CreateUserPayload>` | — |
| DELETE | `/users/{id}` | Deactivate user | — | — |

---

## Roles

**Service:** `src/services/roles.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/roles` | List all roles | — | `Role[]` |
| GET | `/roles/{id}` | Get role by ID | — | `Role` |
| POST | `/roles` | Create role | `{ name, description, permissionsPerEntity: [{ entity, access, permissions[] }] }` | — |
| PUT | `/roles/{id}` | Update role | Same as create | — |

---

## Locations

**Service:** `src/services/locations.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/locations` | List locations | Query: `page, limit` | `{ locations: Location[], totalCount: number }` |
| GET | `/locations/{id}` | Get location by ID | — | `Location` |
| POST | `/locations` | Create location | `CreateLocationPayload { name, gstNumber, contactNumber, countryCode, addressLine1, addressLine2, city, state, zip, country }` | — |
| PATCH | `/locations/{id}` | Update location | `Partial<Location>` | — |

---

## Organization

**Service:** `src/services/organization.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/organizations/my-own` | Get own organization | — | `Organization` |
| PATCH | `/organizations/my-own` | Update organization | `Organization` payload | — |

---

## Organization Settings

**Service:** `src/services/organization-settings.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/organization-settings/my-own` | Get settings | — | `OrganizationSettings { generatePOAutomatically, paymentTerms[], defaultTermsAndConditions[], poCancelReasons[] }` |
| PUT | `/organization-settings/my-own` | Update settings | `Partial<OrganizationSettings>` | `OrganizationSettings` |

---

## Dashboard

**Service:** `src/services/dashboard.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/purchase-orders/analytics/dashboard` | Dashboard overview | Query: `fromDate, toDate` | `{ kpis: { totalSpend, totalRevenue, grossMarginPct, openPOCount, openPOValue, openSOCount, openSOValue, fulfillmentRate, overduePOCount, overdueSOCount, poCount, soCount, trends: { spend, revenue, margin, fulfillment } }, alerts: [], overdueOrders: { po: { watch, warning, critical }, so: { watch, warning, critical } }, spendRevenueHistory: [], topProducts: { topBySpend, topByRevenue }, topSuppliers: [], topBuyers: [], recentActivity: [] }` |

---

## Activity / Audit Trail

**Service:** `src/services/activity.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/audit-trail/entity/purchase_order/{poId}/changes` | Get activity log for an order | — | `AuditEvent[]` |
| GET | `/users` | Get users for display names | — | `{ users: User[] }` |

---

## File Uploads

**Called from:** PurchaseOrderForm, ReceiptFormModal, ProductForm

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| POST | `/files/upload` | Upload file | `FormData` (multipart/form-data) | `{ id: string, name: string }` |

---

## Notifications

**Service:** `src/services/notifications.ts`

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/notifications` | List notifications (paginated) | Query: `page, limit` | `{ data: Notification[], pagination: { total, page, limit }, unreadCount: number }` |
| GET | `/notifications/unread-count` | Get unread badge count | — | `{ data: { count: number } }` |
| PATCH | `/notifications/:id/read` | Mark single notification read | — | `{ data: { success: true } }` |
| PATCH | `/notifications/mark-all-read` | Mark all notifications read | — | `{ data: { success: true } }` |
| POST | `/notifications/internal/trigger-digest` | Manually trigger overdue email digest | Query: `type=po\|so`; Header: `x-cron-secret` (optional) | `{ message: string }` |

**Notification object shape:**
```
{
  _id: string,
  userId: string,
  organizationId: string,
  type: string,
  title: string,           // human-readable e.g. "Purchase order confirmed"
  entityType: string,      // e.g. "purchase_order"
  entityId: string,
  performedBy: string,
  read: boolean,
  readAt?: Date,
  occurredAt: Date
}
```

**Permission required:** `notification.view` (Administrator role only)

---

## Organization Settings — Notification Preferences

Notification preferences are stored on both `OrganizationSettings` and `User` documents.

| Method | Endpoint | Purpose | Request |
|--------|----------|---------|---------|
| PATCH | `/organization-settings/my-own` | Update org-level digest preferences | Include `notificationPreferences: { overdueDigest: { po: { enabled: boolean }, so: { enabled: boolean } } }` in body |
| PATCH | `/users/my-own` | Update user-level digest preferences | Include `notificationPreferences: { overdueDigest: { po: { enabled: boolean }, so: { enabled: boolean } } }` in body |

Both must be `enabled: true` for a digest email to send to a given user.

---

## Notes

- **PO and SO share the same backend endpoints** — differentiated by `orderType` query parameter (`"purchase"` vs `"sales"`)
- **MongoDB decimal fields** use `{ $numberDecimal: string }` format for prices and amounts
- **Pagination** uses `page` (1-based) and `limit` query parameters
- **CSV exports** return `Blob` responses with `responseType: "blob"`
- **File uploads** use `multipart/form-data` content type (overrides default JSON)
- **Array params** are serialized without indexes via `paramsSerializer: { indexes: null }`
