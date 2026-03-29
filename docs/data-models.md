# Data Models

All TypeScript interfaces, types, and enums used across the Aquio frontend. This document serves as the blueprint for the NestJS backend database schema and DTOs.

---

## 1. Core Models

### User

**Service:** `src/services/users.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `email` | `string` | Yes | |
| `phoneNumber` | `string` | Yes | |
| `countryCode` | `string` | Yes | e.g., "91" |
| `roleId` | `string` | Yes | References Role._id |
| `status` | `"active" \| "inactive"` | Yes | |
| `createdAt` | `string` | Yes | ISO date |

**Auth User** (`src/services/auth.ts`) — simplified version used after login:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | Yes | Note: `id` not `_id` |
| `name` | `string` | Yes | |
| `email` | `string` | Yes | |
| `roleId` | `string` | No | Null for users without assigned role |

**Create Payload:**

| Field | Type | Required |
|-------|------|----------|
| `name` | `string` | Yes |
| `phoneNumber` | `string` | Yes |
| `countryCode` | `string` | Yes |
| `email` | `string` | Yes |
| `roleId` | `string` | Yes |

---

### Organization

**Service:** `src/services/organization.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | `string` | Yes | |
| `email` | `string` | Yes | |
| `taxNumber` | `string` | Yes | |
| `phoneNumber` | `string` | Yes | |
| `countryCode` | `string` | Yes | |

**Extended Organization** (`src/services/purchaseOrderForm.ts`) — used in PO/SO forms:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `contactNumber` | `string` | No | |
| `phoneNumber` | `string` | No | |
| `countryCode` | `string` | No | |
| `taxNumber` | `string` | No | |
| `locations` | `Location[]` | Yes | Nested locations array |

---

### Role

**Service:** `src/services/roles.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `description` | `string` | Yes | |
| `status` | `string` | Yes | |
| `organizationId` | `string \| null` | Yes | null for system roles |
| `permissionsPerEntity` | `RolePermission[]` | Yes | See below |

### RolePermission

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `entity` | `string` | Yes | e.g., "product", "purchase-order", "sales-order", "vendor", "category" |
| `access` | `"full" \| "custom" \| "none"` | Yes | "full" grants all permissions for entity |
| `permissions` | `string[]` | Yes | Specific permissions when access is "custom" |

**Permission format:** `{entity}.{action}` — examples:
- `purchase-order.view`, `purchase-order.add`, `purchase-order.edit`, `purchase-order.cancel`, `purchase-order.confirm`, `purchase-order.force-close`, `purchase-order.receipt-add`, `purchase-order.receipt-edit`, `purchase-order.receipt-delete`, `purchase-order.download-csv`, `purchase-order.download-pdf`
- `sales-order.view`, `sales-order.add`, `sales-order.edit`, `sales-order.cancel`, `sales-order.confirm`, `sales-order.force-close`, `sales-order.receipt-add`, `sales-order.receipt-edit`, `sales-order.receipt-delete`, `sales-order.download-csv`, `sales-order.download-pdf`
- `product.view`, `product.add`, `product.edit`, `product.archive`
- `vendor.view`, `vendor.add`, `vendor.edit`
- `category.view`, `category.add`, `category.edit`

---

## 2. Order Models

### PurchaseOrder / SalesOrder

**Services:** `src/services/purchase-orders.ts`, `src/services/sales-orders.ts`

> PO and SO share the exact same data structure. The only difference is `orderType` in the create payload and the query parameter when listing. All field names remain the same (`poNumber`, `supplier`, `receiptStatus`, etc.) even for Sales Orders.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `id` | `string` | Yes | Same as _id (convenience alias) |
| `poNumber` | `string` | Yes | Order number (used for both PO and SO) |
| `status` | `"confirmed" \| "issued" \| "completed" \| "draft" \| "cancelled"` | Yes | |
| `receiptStatus` | `"pending" \| "partial" \| "completed" \| "force closed" \| "excess delivered"` | Yes | Receipt/Shipment fulfillment status |
| `issueDate` | `string` | Yes | ISO date |
| `deliveryDate` | `string` | Yes | ISO date |
| `referenceId` | `string` | Yes | Can be empty string |
| `supplierReferenceId` | `string` | Yes | Can be empty string |
| `supplier` | `Supplier` | Yes | See Supplier below |
| `buyer` | `{ name: string }` | No | Consignee |
| `biller` | `{ name: string }` | No | Billing party |
| `purchaseOrderPDF` | `string \| { id: string, name: string }` | No | PDF URL or file reference |
| `totalAmount` | `{ $numberDecimal: string } \| number` | Yes | **MongoDB Decimal128** — see notes |
| `totalQuantity` | `number` | No | Aggregated total |
| `pendingQuantity` | `number` | No | Aggregated pending |
| `receiptCompletionPercentage` | `number` | Yes | 0-100 |
| `delayDays` | `number` | Yes | 0 if not overdue |
| `paymentTerms` | `string` | Yes | |
| `hasUniformUOM` | `boolean` | No | false if products have mixed units |
| `commonUOM` | `string` | No | Only set if hasUniformUOM is true |
| `products` | `OrderProduct[]` | No | Only in comprehensive response |
| `remainingItems` | `RemainingItem[]` | No | Only in comprehensive response |
| `receipts` | `Receipt[]` | No | Only in comprehensive response |
| `notes` | `string` | No | |
| `termsAndConditions` | `string[]` | No | |

### Supplier (embedded in Order)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | Yes | |
| `name` | `string` | Yes | |

### OrderProduct (POProduct / SOProduct)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product` | `{ _id: string }` | Yes | Product reference |
| `variant` | `{ _id: string }` | Yes | Variant reference |
| `metadata` | `OrderProductMetadata` | Yes | Denormalized names |
| `quantity` | `{ value: number, postfix: string }` | Yes | postfix = UOM |
| `price` | `{ value: { $numberDecimal: string } }` | Yes | **MongoDB Decimal128** |
| `gst` | `{ value: number }` | Yes | GST percentage |
| `totalAmount` | `{ $numberDecimal: string }` | Yes | **MongoDB Decimal128** |

### OrderProductMetadata

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product` | `{ _id: string, name: string, sku: string, hsnCode: string, categoryId: string, subCategoryId: string, unitOfMeasurement: string, gst: number, description: string, termsOfConditions: string[], variants: ProductVariant[], status: string, createdBy: string, organizationId: string, files: { id: string, name: string }[], createdAt: string, updatedAt: string, categoryName: string, subCategoryName: string }` | Yes | Full product snapshot at time of order |
| `variant` | `{ name: string, customAttributes: CustomAttribute[], _id: string }` | Yes | Full variant snapshot |

### RemainingItem (PORemainingItem / SORemainingItem)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | `string` | Yes | References product._id |
| `variantId` | `string` | Yes | References variant._id |
| `remainingQuantity` | `number` | Yes | |
| `status` | `string` | No | e.g., "delivered", "excess delivered", "forcefully closed" |
| `closedBy` | `string` | No | User ID — only when status is "forcefully closed" |
| `closedAt` | `string` | No | ISO date — only when status is "forcefully closed" |
| `excessQuantity` | `number` | No | |

### Receipt (POReceipt / SOReceipt)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `userId` | `string` | Yes | Who created the receipt |
| `deliveryDate` | `string` | Yes | ISO date |
| `products` | `ReceiptProduct[]` | Yes | |
| `notes` | `string` | Yes | Can be empty string |
| `files` | `any[]` | Yes | File attachments |
| `createdAt` | `string` | Yes | ISO date |

### ReceiptProduct (POReceiptProduct / SOReceiptProduct)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `productId` | `string` | Yes | |
| `variantId` | `string` | Yes | |
| `deliveredQuantity` | `number` | Yes | Quantity received/shipped |
| `allowExcess` | `boolean` | Yes | Whether excess was allowed |
| `excessQuantity` | `number` | Yes | |

### CreatePOPayload (Create/Update Order)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `orderType` | `"purchase" \| "sales"` | Yes | Determines PO vs SO |
| `status` | `"issued" \| "draft"` | Yes | |
| `poNumber` | `string` | Yes | Empty string if auto-generated |
| `supplier` | `PartnerPayload` | Yes | See below |
| `buyer` | `PartnerPayload` | Yes | |
| `biller` | `PartnerPayload` | Yes | |
| `referenceId` | `string` | Yes | Can be empty |
| `supplierReferenceId` | `string` | Yes | Can be empty |
| `issueDate` | `string` | Yes | YYYY-MM-DD |
| `deliveryDate` | `string` | Yes | YYYY-MM-DD |
| `paymentTerms` | `string` | Yes | |
| `termsAndConditions` | `string[]` | Yes | |
| `notes` | `string` | Yes | |
| `products` | `ProductLinePayload[]` | Yes | See below |
| `files` | `{ id: string, name: string }[]` | Yes | |

### PartnerPayload (embedded in CreatePOPayload)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | Yes | Company/org ID |
| `name` | `string` | Yes | |
| `taxNumber` | `string` | No | |
| `contactNumber` | `string` | Yes | |
| `address` | `PartnerAddressPayload` | Yes | See below |

### PartnerAddressPayload

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | Location ID |
| `addressLine1` | `string` | No | |
| `addressLine2` | `string` | No | |
| `city` | `string` | No | |
| `state` | `string` | No | |
| `country` | `string` | No | |
| `postalCode` | `string` | No | |
| `gstNumber` | `string` | No | |

### ProductLinePayload (product in CreatePOPayload)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product` | `{ _id: string, value: string }` | Yes | value = product name |
| `variant` | `{ _id: string, value: string }` | Yes | value = variant name |
| `quantity` | `{ value: number, postfix: string }` | Yes | postfix = UOM |
| `price` | `{ value: number, prefix: string, suffix: string }` | Yes | prefix="₹", suffix="per unit" |
| `gst` | `{ value: number, postfix: string }` | Yes | postfix="%" |
| `discount` | `{ value: number }` | Yes | |

### ForceCloseItem

| Field | Type | Required |
|-------|------|----------|
| `productId` | `string` | Yes |
| `variantId` | `string` | Yes |

### Order Status Counts

| Field | Type | Required |
|-------|------|----------|
| `all` | `number` | Yes |
| `inProgress` | `number` | Yes |
| `completed` | `number` | Yes |
| `draft` | `number` | Yes |
| `cancelled` | `number` | Yes |
| `delayed` | `number` | Yes |

### Order Filter Types

```typescript
type POFilterStatus = "in_progress" | "completed" | "draft" | "cancelled" | "delayed";
type POOrderStatus = "confirmed" | "issued" | "completed" | "draft" | "cancelled";
type CsvPattern = "basic" | "comprehensive";
```

---

## 3. Catalog Models

### Product

**Service:** `src/services/products.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `sku` | `string` | Yes | Product code |
| `hsnCode` | `string` | Yes | HSN/SAC code |
| `categoryId` | `string` | Yes | References Category._id |
| `subCategoryId` | `string` | Yes | References SubCategory._id |
| `categoryName` | `string` | Yes | Denormalized |
| `subCategoryName` | `string` | Yes | Denormalized |
| `unitOfMeasurement` | `string` | Yes | e.g., "Kilogram", "Square Inch", "Pouch" |
| `gst` | `number` | Yes | GST percentage |
| `status` | `"active" \| "inactive" \| "archived"` | Yes | |
| `description` | `string` | No | |
| `termsOfConditions` | `string[]` | No | |
| `variants` | `ProductVariant[]` | Yes | At least one variant |
| `files` | `{ id: string, name: string }[]` | No | Attached files |
| `createdAt` | `string` | Yes | ISO date |

### ProductVariant

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | e.g., "Default Variant", "01", "02" |
| `customAttributes` | `ProductCustomAttribute[]` | Yes | Defined by subcategory |

### ProductCustomAttribute

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | |
| `label` | `string` | Yes | e.g., "Size", "Color", "Surface" |
| `unit` | `string` | Yes | e.g., "type", "touch" |
| `value` | `string` | Yes | Can be empty string |

### Category

**Service:** `src/services/categories.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `status` | `string` | Yes | |
| `subCategories` | `SubCategory[]` | Yes | Nested subcategories |

### SubCategory

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `customAttributes` | `SubCategoryCustomAttribute[]` | No | Defines attribute schema for variants |

### SubCategoryCustomAttribute

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `label` | `string` | Yes | Attribute name |
| `unit` | `string` | Yes | Attribute type/unit |
| `required` | `boolean` | Yes | Whether required for variants |
| `valueType` | `"text" \| "dropdown"` | Yes | Input type |
| `values` | `string` | No | Comma-separated options for dropdown type |

### ProductSearchResult (simplified product for typeahead)

**Service:** `src/services/purchaseOrderForm.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | |
| `name` | `string` | Yes | |
| `unitOfMeasurement` | `string` | Yes | |
| `gst` | `number` | Yes | |
| `variants` | `{ _id: string, name: string }[]` | Yes | Simplified variants |

---

## 4. Partner & Location Models

### VendorCompany (Partner)

**Service:** `src/services/partners.ts` (list), `src/services/purchaseOrderForm.ts` (with locations)

**List view:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `contactNumber` | `string` | Yes | |
| `countryCode` | `string` | Yes | |
| `taxNumber` | `string` | Yes | |
| `poReminder` | `boolean` | Yes | |
| `status` | `"active" \| "inactive"` | Yes | |
| `createdAt` | `string` | Yes | ISO date |

**With locations** (for PO/SO form):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | |
| `name` | `string` | Yes | |
| `contactNumber` | `string` | No | |
| `phoneNumber` | `string` | No | |
| `countryCode` | `string` | No | |
| `taxNumber` | `string` | No | |
| `status` | `"active" \| "inactive"` | Yes | |
| `locations` | `Location[]` | Yes | Nested locations |

### Location

**Service:** `src/services/locations.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `name` | `string` | Yes | |
| `gstNumber` | `string` | Yes | |
| `addressLine1` | `string` | Yes | |
| `addressLine2` | `string` | Yes | Can be empty |
| `city` | `string` | Yes | |
| `state` | `string` | Yes | |
| `zip` | `string` | Yes | |
| `country` | `string` | Yes | |
| `status` | `"active" \| "inactive"` | Yes | |
| `isDefault` | `boolean` | Yes | |
| `createdAt` | `string` | Yes | ISO date |
| `updatedAt` | `string` | Yes | ISO date |

**Location in PO form** (`src/services/purchaseOrderForm.ts`) — has additional optional fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | |
| `name` | `string` | Yes | |
| `gstNumber` | `string` | No | |
| `contactNumber` | `string` | No | |
| `countryCode` | `string` | No | |
| `addressLine1` | `string` | No | |
| `addressLine2` | `string` | No | |
| `city` | `string` | No | |
| `state` | `string` | No | |
| `zip` | `string` | No | |
| `country` | `string` | No | |
| `address` | `Address` | No | Legacy nested format |

### Address (legacy nested format)

| Field | Type | Required |
|-------|------|----------|
| `street` | `string` | No |
| `addressLine1` | `string` | No |
| `addressLine2` | `string` | No |
| `city` | `string` | No |
| `state` | `string` | No |
| `pincode` | `string` | No |
| `zip` | `string` | No |
| `country` | `string` | No |

---

## 5. Settings Models

### OrganizationSettings

**Service:** `src/services/organization-settings.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | MongoDB ObjectId |
| `organizationId` | `string` | Yes | |
| **PO Settings** | | | |
| `poCancelReasons` | `string[]` | Yes | Dropdown options for PO cancellation |
| `paymentTerms` | `string[]` | Yes | PO payment terms options |
| `isPOReferenceIDInternal` | `boolean` | Yes | |
| `generatePOAutomatically` | `boolean` | Yes | Auto-generate PO numbers |
| `poPrefix` | `string` | Yes | e.g., "PO" |
| `poSeparator` | `string` | Yes | e.g., "/" |
| `nextPONumber` | `number` | Yes | Next sequential number |
| **SO Settings** | | | |
| `soCancelReasons` | `string[]` | Yes | |
| `soPaymentTerms` | `string[]` | Yes | |
| `isSOReferenceIDInternal` | `boolean` | Yes | |
| `generateSOAutomatically` | `boolean` | Yes | |
| `soPrefix` | `string` | Yes | e.g., "SO" |
| `soSeparator` | `string` | Yes | |
| `nextSONumber` | `number` | Yes | |
| **Product Settings** | | | |
| `generateSKUAutomatically` | `boolean` | Yes | |
| `skuPrefix` | `string` | Yes | |
| `skuSeparator` | `string` | Yes | |
| `nextSKUNumber` | `number` | Yes | |
| **General** | | | |
| `applicableGst` | `number[]` | Yes | Available GST rates |
| `logo` | `{ id: string, name: string }` | No | Organization logo file |
| `createdAt` | `string` | Yes | ISO date |
| `updatedAt` | `string` | Yes | ISO date |

### POFormSettings (subset used by PO/SO form)

**Service:** `src/services/purchaseOrderForm.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `paymentTerms` | `string[]` | Yes | |
| `generatePOAutomatically` | `boolean` | Yes | |
| `poPrefix` | `string` | Yes | |
| `poSeparator` | `string` | Yes | |
| `nextPONumber` | `number` | Yes | |

---

## 6. Shared / Utility Types

### Pagination

| Field | Type | Required |
|-------|------|----------|
| `total` | `number` | Yes |
| `page` | `number` | Yes |
| `limit` | `number` | Yes |

### AuditEvent

**Service:** `src/services/activity.ts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | `string` | Yes | |
| `entityType` | `string` | Yes | e.g., "purchase_order" |
| `entityId` | `string` | Yes | |
| `subEntityId` | `string` | No | e.g., receipt ID |
| `action` | `"create" \| "update" \| "cancel" \| "receipt_create" \| "forcefully_close_item"` | Yes | |
| `userId` | `string` | Yes | Who performed the action |
| `organizationId` | `string` | Yes | |
| `previousValues` | `Record<string, any>` | No | Snapshot before change |
| `newValues` | `Record<string, any>` | No | Snapshot after change |
| `metadata` | `Record<string, any>` | No | |
| `timestamp` | `string` | Yes | ISO date |

### ProductDiff (computed client-side for activity display)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"added" \| "removed" \| "updated"` | Yes | |
| `productId` | `string` | Yes | |
| `variantId` | `string` | Yes | |
| `name` | `string` | Yes | Product name |
| `variantName` | `string` | Yes | |
| `quantity` | `number` | No | |
| `uom` | `string` | No | |
| `price` | `number` | No | New price (if updated) |
| `gst` | `number` | No | New GST (if updated) |
| `oldPrice` | `number` | No | Previous price |
| `oldGst` | `number` | No | Previous GST |
| `oldQuantity` | `number` | No | Previous quantity |

### UploadedFile

| Field | Type | Required |
|-------|------|----------|
| `id` | `string` | Yes |
| `name` | `string` | Yes |

### ColumnConfig (UI-only, not persisted to backend)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `key` | `string` | Yes | Column identifier |
| `label` | `string` | Yes | Display name |
| `locked` | `boolean` | Yes | Cannot be hidden/reordered |

### RoutePermission (UI-only)

| Field | Type | Required |
|-------|------|----------|
| `path` | `string` | Yes |
| `permissions` | `string[]` | Yes |

---

## MongoDB-Specific Patterns

### $numberDecimal

MongoDB stores `Decimal128` values as `{ $numberDecimal: string }`. This pattern appears in:
- `PurchaseOrder.totalAmount` — can be `{ $numberDecimal: string } | number` (backend inconsistency)
- `POProduct.price.value` — always `{ $numberDecimal: string }`
- `POProduct.totalAmount` — always `{ $numberDecimal: string }`

The frontend parses these with `parseFloat(field.$numberDecimal)`.

### _id vs id

- Most models use `_id` (MongoDB default)
- `PurchaseOrder` and `SalesOrder` have both `_id` and `id` — the frontend uses `order.id ?? order._id`
- Auth `User` returns `id` (not `_id`)
- `Supplier` embedded in orders uses `id` (not `_id`)

---

## PO vs SO Field Differences

Despite sharing the same data model, PO and SO differ in these ways:

| Aspect | Purchase Order | Sales Order |
|--------|---------------|-------------|
| `orderType` in create payload | `"purchase"` | `"sales"` |
| List query `orderType` param | `"purchase"` | `"sales"` |
| UI label: order number | "PO Number" | "SO Number" |
| UI label: supplier entity | "Supplier" | "Supplier" (same) |
| UI label: buyer entity display | N/A | "Buyer" column shows `biller.name` |
| UI label: receipt concept | "Receipt" | "Shipment" |
| UI label: received quantity | "Received" | "Shipped" |
| React Query key | `"purchase-order"` / `"purchase-orders"` | `"sales-order"` / `"sales-orders"` |
| localStorage prefs key | `"po-column-prefs"` | `"so-column-prefs"` |
| Permission prefix | `"purchase-order.*"` | `"sales-order.*"` |

All API endpoints, field names, and data structures are identical.

---

## Fields Frontend Treats as Optional but May Be Required by Backend

| Model | Field | Frontend | Backend (likely) |
|-------|-------|----------|-----------------|
| PurchaseOrder | `buyer` | Optional (`buyer?.name`) | Likely required in create |
| PurchaseOrder | `biller` | Optional (`biller?.name`) | Likely required in create |
| PurchaseOrder | `products` | Optional (only in comprehensive) | Required in create |
| PurchaseOrder | `totalAmount` | `{ $numberDecimal } \| number` | Probably always $numberDecimal |
| PurchaseOrder | `purchaseOrderPDF` | Optional string | Generated server-side |
| Location | `contactNumber` | Optional in form Location | Required in list Location |
| VendorCompany | `taxNumber` | Optional in form | Required in list Partner |
| User | `roleId` | Optional in Auth User | Required in Users service |
