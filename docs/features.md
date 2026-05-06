# Aquio — Implemented Features

Complete reference of everything built and live in production.
Last updated: 2026-05-06

---

## Deployment

| Layer | Platform | Details |
|---|---|---|
| Frontend (aquio-ui) | Vercel | Build: `npm run build`, framework: Next.js (auto-detected) |
| Backend (aquio-backend) | Render | Build: `npm run build`, start: `node dist/main` |
| Database | MongoDB Atlas | Shared with prokure-backend (same collections) |

Frontend env var: `NEXT_PUBLIC_API_BASE_URL=<Render backend URL>`

---

## Auth & Sign-Up

- **Sign-up** — Company name, name, email, phone, password. Calls `POST /organizations/signup`. Stores JWT, redirects to `/onboarding`.
- **Password rules** — Enforced on all password flows (signup, set-password, change-password): min 8 characters, at least one uppercase letter, one lowercase letter, one number, one special character. Validated on both UI (Zod/manual) and backend (`class-validator` `@Matches` decorators).
- **Password strength indicator** — Live strength bar (Weak/Fair/Good/Strong) + checklist (8+ chars, uppercase, number, special char) on the signup form.
- **Login** — Email + password. Multi-org: if user belongs to multiple orgs, prompted to choose. JWT + refresh token stored in localStorage.
- **Email verification** — Banner on `/verify-email` after signup. Backend sends verification email via Resend.
- **Forgot password** — `/forgot-password` sends reset email. `/reset-password` sets new password via token.
- **Set password** — `/set-password` for invited users to set their initial password.
- **JWT refresh** — Axios interceptor auto-refreshes expired access tokens using refresh token.
- **Logout** — Clears localStorage, calls `POST /auth/logout`.

---

## Onboarding

- **5-step wizard** — Shown after signup: Location → Settings → Category → Partner → Product. Each step links to the relevant page.
- **Setup banner on Dashboard** — Shows which steps are still incomplete with direct action links. Disappears once all steps are done.
- Steps checked server-side via `GET /organizations/onboarding-status`.

---

## Dashboard

Four-tab layout with a shared period selector (This Month / This Quarter / Last 30 Days / Last 12 Months).

- **Overview tab** — Morning check. Quick-action buttons (New PO / New SO) in header. Four KPI cards: Total Spend, Total Revenue, Gross Margin % (conditional — shown only when both buying and selling data exist in the period, otherwise "—" with tooltip), Fulfillment Rate. **Overdue Orders widget** (always visible): Watch / Warning / Critical severity pill buttons for both POs and SOs; clicking any pill opens a Radix Popover listing up to 10 orders with order number, counterparty, and days overdue (direct links). **Alerts & Insights** panel — auto-expands when critical or warning alerts are present. Combined Spend vs Revenue bar chart with Gross Margin % trend line (secondary Y-axis).
- **Buying tab** — PO deep-dive. KPIs: Total Spend, Open POs (count + value), Overdue POs, Fulfillment Rate. Overdue PO severity widget. Monthly spend bar chart. Top Suppliers table (spend, fulfillment %, price trend). Top Products by Spend table.
- **Selling tab** — SO deep-dive. KPIs: Total Revenue, Open SOs (count + value), Overdue SOs, Total SO count. Overdue SO severity widget. Monthly revenue bar chart. Top Buyers table (revenue, fulfillment %, price trend). Top Products by Revenue table.
- **Old View tab** — Original dashboard layout preserved: 6 KPI cards, Alerts & Insights, Spend vs Revenue chart, Recent Activity feed, Top Products (both), Top Suppliers and Top Buyers.
- **Onboarding checklist** — Shown instead of dashboard for new orgs. Five-step setup (Location → Settings → Category → Partner → Product) with inline quick-create modals. Progress bar. One-time celebration screen on completion.
- **Dark mode** — Toggle in sidebar user menu. Persists across sessions.

---

## Purchase Orders

- **List page** — Filterable by status (draft, issued, confirmed, completed, cancelled), date range, supplier. Sortable columns. Column visibility preferences saved in localStorage. Auto-refreshes every 30 seconds.
- **Detail page** — Full order view: supplier/consignee/buyer cards, product table, receipt history, activity timeline, audit trail. Auto-refreshes every 30 seconds so peer actions (confirm, cancel, receipts) appear without a manual refresh.
- **Create / Edit** — Shared `PurchaseOrderForm` component. Supplier, consignee, buyer selection with location. Product typeahead with inline quick-create. Payment terms custom dropdown with inline create. Attach files. Terms & conditions list. Issue date and delivery date pickers.
- **Duplicate** — Create a copy of any existing order pre-filled with the same data.
- **Status transitions** — Draft → Issued → Confirmed → Completed. Cancel at any non-completed stage. Force close (permission-gated).
- **Receipts (GRN)** — Record partial or full receipt per product. Quantity, notes, and file attachments. Attached files shown as clickable download links on receipt cards. Receipt status: pending / partial / completed / force closed / excess delivered.
- **PDF** — Generate PDF (pdfkit + NotoSans, uploaded to S3). Download from order header. Allowed for issued/confirmed/completed orders.
- **Delay tracking** — `delayDays` computed from expected delivery date. Overdue banner shown on detail page. Daily cron recalculates all open orders.
- **CSV export** — Export filtered order list.

---

## Sales Orders

- **All PO features apply** — Same `PurchaseOrderForm` with `orderType="sales"`. Same modals reused with relabelled fields (Supplier→Customer, Receipt→Shipment).
- **Shipment tracking** — Mirror of PO receipts for outbound shipments. Attached files shown as clickable download links on shipment cards.
- **PDF** — Same generate/download flow as PO.
- **Auto-refresh** — List and detail pages both poll every 30 seconds.

---

## Products

- **List** — Search, filter by category, sort. Archive/unarchive.
- **Detail** — Product info, variants management, custom attributes, purchase history, pricing trends across suppliers.
- **Create / Edit** — Name, category, subcategory, UOM, SKU (manual or auto-generated), HSN code, GST rate. Variants with custom attributes.
- **Quick-create modal** — Inline product creation from PO/SO form product search dropdown. Pre-fills name from search query.

---

## Categories

- **Accordion view** — Categories with expandable subcategories.
- **Create / Edit / Delete** — For both categories and subcategories.
- **Custom attributes** — Define typed attributes (text, number, dropdown) per category. Propagated to products.
- **Quick-create modal** — Inline category/subcategory creation from product form.

---

## Partners (Suppliers / Buyers)

- **List** — Search, filter by status.
- **Detail page** — Info card (contact, tax number, PO reminder toggle, member since). Edit mode. Locations tab with add-location modal.
- **Create** — Name, country code, contact number, tax number, email.
- **Quick-create modal** — Inline partner creation from PO/SO form.

---

## Locations

- **List** — All org locations with GST and address.
- **Create / Edit** — Name, address, GST number, default flag.
- **Quick-create modal** — Inline location creation from partner detail page.
- **Partner locations** — Each partner has their own locations managed from their detail page.

---

## Users

- **List** — All org members with role and status.
- **Invite** — Send invite email. Invited user sets password via `/set-password`.
- **Edit** — Change name, role, status.
- **Soft delete** — Deactivate users without removing data.

---

## Roles & Permissions

- **List** — All org roles.
- **Create / Edit** — Role name, description, permissions matrix per entity (full / custom / none).
- **Permission format** — `entity.action` (e.g. `purchase-order.force-close`).
- **Admin bypass** — Admin role has all permissions regardless of matrix.
- **System role protection** — Admin role cannot be deleted or modified.
- **`RequirePermission` component** — Wraps UI elements; hides if user lacks permission.
- **`RouteGuard`** — Blocks navigation to routes the user doesn't have access to.

---

## Settings

- **Organisation settings** — Payment terms (PO + SO), GST rates, PO/SO number auto-generation, SKU auto-generation, reference ID visibility.
- **Notification preferences tab** — Org-level toggles for PO and SO overdue email digests. Both org-level and user-level must be enabled for a user to receive a digest.
- **Quick-configure modal** — Accessible from onboarding banner for fast initial setup.

---

## Profile

- **Edit** — Name, phone number.
- **Email** — Read-only (cannot change email after signup).
- **Notification preferences** — User-level toggles for PO and SO overdue email digests. Independent of org-level settings; both must be enabled for the digest to send.
- **Change password** — Current password + new password with complexity enforcement.

---

## Notifications

- **Sidebar bell icon** — Unread count badge shown directly below Dashboard in the sidebar. Polls every 30 seconds. Badge capped at 99+.
- **`/notifications` page** — Flat list of all in-app notifications for the logged-in Administrator. Unread items highlighted in teal. Clicking an item marks it read and navigates to the related record (PO, SO, product, etc.). Mark All Read button. Load-more pagination.
- **Fan-out source** — Every event written to the audit trail is fanned out as a notification to all active Administrator users in the organisation. Forward-only: new admins don't receive history from before they joined.
- **Overdue email digest** — Two separate daily emails (PO and SO) sent at 8:00 AM IST. Severity-bucketed table: Watch (1–2d), Warning (3–6d), Critical (7+d). If no overdue orders exist, sends a short all-clear email. Logs stored in `emaildigestlogs` collection.
- **Permission-gated** — Only users with `notification.view` permission (Administrator role) can see the notifications page and sidebar badge.
- **Offline banner** — Fixed red bar at top of screen when internet connection is lost. Listens to browser `online`/`offline` events.

---

## Company Profile

- **View / Edit** — Company name, email, phone, tax number.

---

## Files

- **Upload** — Attach files to POs/SOs and receipts/shipments during create/edit. All uploads go through the `uploadFile()` helper in `api-client.ts` which correctly omits the `Content-Type` header so the browser sets the multipart boundary automatically. `POST /files/upload` (multipart).
- **Download** — `GET /files/download/:id` streams file from S3. Files on product detail pages and receipt/shipment cards are rendered as clickable download links (pill with Paperclip icon).
- **Programmatic upload** — `filesService.uploadBuffer()` used by PDF generation to upload generated PDFs to S3 without Multer.

---

## Activity / Audit Trail

- **Timeline** — All actions on an order shown chronologically: created, status changed, receipt added, file attached, etc.
- **Event-driven** — Backend emits events via EventBus; audit module records them. Never called directly from business modules.

---

## Key Component Patterns

| Pattern | Where |
|---|---|
| Custom typeahead dropdown (fixed-position, search, teal create option) | `ProductTypeahead`, `PaymentTermsTypeahead` in `PurchaseOrderForm.tsx` |
| Inline quick-create modal (`onCreateNew` prop + `initialName` pre-fill) | `QuickCreateProductModal`, `QuickCreatePartnerModal`, `QuickCreateCategoryModal`, `QuickCreateLocationModal` |
| Partner detail page structure | `src/app/(dashboard)/partners/[id]/page.tsx` + `components/partners/details/` |
| PDF generate/download on order headers | `PODetailsHeader.tsx`, `SODetailsHeader.tsx` — `purchaseOrderPDF` is `{ id, name }` object |
| Shared PO/SO form | `PurchaseOrderForm` with `orderType="purchase" \| "sales"` prop |
| PO modals reused by SO | All modals accept `orderType` prop to switch labels |

---

## Backend — All Modules Live on Render

| Module | Key endpoints |
|---|---|
| Auth | `POST /users/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /users/forgot-password`, `POST /users/set-password` |
| Organizations | `GET/PATCH /organizations/my-own`, `POST /organizations/signup`, `GET /organizations/onboarding-status` |
| OrganizationSettings | `GET/PATCH /organization-settings/my-own`, add payment term, add SO payment term |
| Locations | `GET/POST/PATCH/DELETE /locations` |
| Categories | `GET/POST/PATCH/DELETE /categories`, subcategories endpoints |
| Products | `GET/POST/PATCH/DELETE /products`, variants, analytics |
| Partners | `GET/POST/PATCH/DELETE /partners`, partner locations sub-module |
| Files | `POST /files/upload`, `GET /files/download/:id` |
| Users | `GET/POST/PATCH/DELETE /users`, invite, verify email |
| Roles | `GET/POST/PATCH/DELETE /roles` |
| Orders | `GET/POST/PATCH /purchase-orders`, receipts, status transitions, CSV export, dashboard analytics |
| PDF | `PATCH /purchase-orders/:id/pdf` — generates PDF, uploads to S3, returns file metadata |
| Audit | Event-driven, no direct endpoints; emits `audit.event.written` after each flush |
| Notifications | `GET/PATCH /notifications`, `GET /notifications/unread-count`, `POST /notifications/internal/trigger-digest` |
