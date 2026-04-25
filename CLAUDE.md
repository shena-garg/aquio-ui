# CLAUDE.md — Aquio UI

> **This frontend is feature-complete and live on Netlify. Structural changes (folder reorganization, library swaps, architecture overhauls) should be avoided unless explicitly requested by the user.**

## Project Overview

Aquio is a B2B SaaS platform for managing purchase orders, sales orders, products, partners, and inventory. Built with Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS.

## Folder Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Public auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/            # Protected pages (sidebar + auth)
│   │   ├── layout.tsx          # AuthProvider + Sidebar + RouteGuard
│   │   ├── dashboard/          # Analytics dashboard with charts
│   │   ├── purchase-orders/    # List, [id] detail, [id]/edit, create
│   │   ├── sales-orders/       # List, [id] detail, [id]/edit, create
│   │   ├── products/           # List, [id] detail, new
│   │   ├── categories/         # Category + subcategory management
│   │   ├── partners/           # Vendor companies
│   │   ├── locations/          # Locations with GST/address
│   │   ├── users/              # User management, [id]/edit
│   │   ├── roles/              # Role + permission management
│   │   ├── settings/           # Organization settings
│   │   ├── company/            # Company profile
│   │   └── profile/            # User profile
│   ├── layout.tsx              # Root layout (QueryClient, Toaster, fonts)
│   └── globals.css             # Tailwind + global styles
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, dialog, table, popover, etc.)
│   ├── layout/                 # PageHeader, Sidebar
│   ├── auth/                   # RequirePermission, RouteGuard, AccessDenied
│   ├── activity/               # ActivityTimeline for audit trails
│   ├── purchase-orders/        # PO components
│   │   ├── details/            # PODetailsHeader, PODetailsTabs, PODetailsProgress, etc.
│   │   └── modals/             # CancelPOModal, ConfirmPOModal, ForceClosePOModal, ReceiptFormModal, etc.
│   ├── sales-orders/           # SO components (mirrors PO structure)
│   │   └── details/
│   ├── products/               # ProductForm, ProductsTable
│   │   └── details/
│   ├── partners/               # PartnersTable, QuickCreatePartnerModal
│   │   └── details/            # PartnerDetailsHeader, PartnerDetailsInfoCard, PartnerDetailsTabs
│   ├── locations/              # LocationsTable, LocationForm, LocationFormFields, QuickCreateLocationModal
│   ├── users/                  # UsersTable, UserForm
│   ├── roles/                  # RolesTable, RoleForm
│   ├── categories/             # CategoriesAccordion, QuickCreateCategoryModal
│   └── settings/               # QuickConfigureSettingsModal
├── services/                   # API service layer (one file per entity)
│   ├── auth.ts
│   ├── purchase-orders.ts
│   ├── sales-orders.ts
│   ├── purchaseOrderForm.ts    # Specialized helpers for PO/SO create/edit form
│   ├── products.ts
│   ├── categories.ts
│   ├── partners.ts
│   ├── users.ts
│   ├── roles.ts
│   ├── locations.ts
│   ├── organization.ts
│   ├── organization-settings.ts
│   ├── dashboard.ts
│   └── activity.ts
├── contexts/
│   └── AuthContext.tsx          # Auth state, permissions, user/role data
├── hooks/
│   └── usePermissions.ts       # Thin wrapper around AuthContext
└── lib/
    ├── api-client.ts           # Axios instance with auth interceptor
    ├── utils.ts                # cn() helper for Tailwind class merging
    ├── route-permissions.ts    # Route-to-permission mapping
    └── uom.ts                  # Unit of measurement abbreviations
```

## Dev Server

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (Next.js)
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check without emitting
```

## Environment Variables

Only one environment variable is needed:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend-url>.onrender.com
```

Copy `.env.example` to `.env.local` and set the API URL.
For Netlify deployment, set this in Netlify's environment variables dashboard.

## State Management

| Layer | Tool | Usage |
|-------|------|-------|
| Server state | React Query (`@tanstack/react-query`) | API data fetching, caching, invalidation |
| Auth state | React Context (`AuthContext`) | User, role, permissions, login/logout |
| Form state | React Hook Form + Zod | Form validation and submission |
| Persistence | localStorage | `accessToken`, `user`, column preferences |
| UI state | React useState | Modals, filters, tabs, selections |

**React Query conventions:**
- `staleTime: 2 * 60 * 1000` (2 min) for most queries
- `staleTime: 5 * 60 * 1000` (5 min) for rarely-changing data (roles)
- `staleTime: 10 * 60 * 1000` (10 min) for categories, org settings
- Invalidate with `queryClient.invalidateQueries({ queryKey: [...] })` after mutations

## TypeScript Patterns

- **Interfaces** for data models and component props
- **Type aliases** for union types (`POOrderStatus`, `POFilterStatus`)
- **Service objects** exported as `const xxxService = { list, getById, create, ... }`
- **Generic Axios calls**: `apiClient.get<ResponseType>(url)`
- **Strict mode** enabled in tsconfig
- **Path alias**: `@/` resolves to `./src/`

## Component Conventions

- All interactive components use `"use client"` directive
- Feature-based directory structure: `/components/{feature}/{Component}.tsx`
- UI primitives in `/components/ui/` (shadcn/ui + Radix UI)
- Icons from `lucide-react` (individual named imports, tree-shaken)
- Styling: Tailwind CSS utility classes, `cn()` for conditional merging
- Color scheme: Gray/slate base, teal primary (`#0d9488`), red for destructive (`#dc2626`), orange for force close (`#ea580c`)

## Auth & Permissions

- JWT stored in localStorage, attached via Axios request interceptor
- 401 responses redirect to `/login`
- `RouteGuard` checks route-level permissions on every navigation
- `RequirePermission` component wraps UI elements for permission-gated rendering
- `useAuth().hasPermission("entity.action")` for inline permission checks
- Permission format: `{entity}.{action}` (e.g., `purchase-order.force-close`)

## Backend Cutover Status (as of 2026-04-21)

- **aquio-backend is fully built and deployed on Render** — all Phase 1 modules complete including PDF generation
- **aquio-ui is live and pointing to aquio-backend** — cutover complete
- `NEXT_PUBLIC_API_BASE_URL` in production env points to the Render backend URL
- In `.env.local` for development: use Render URL or `http://localhost:3001` if running locally
- The email verification banner (`/verify-email`) is implemented in the frontend
- The forgot password page (`/forgot-password` and `/reset-password`) is implemented in the frontend

## Key Component Patterns (Important for Future Work)

- **Custom typeahead dropdowns** — Use fixed positioning via `getBoundingClientRect` + `useRef`. See `ProductTypeahead` and `PaymentTermsTypeahead` in `PurchaseOrderForm.tsx` as the canonical pattern. Reposition on scroll/resize while open.
- **Inline quick-create modals** — Pattern: `onCreateNew?: (query: string) => void` prop on typeaheads; parent manages modal open state and `initialName` pre-fill. See `QuickCreateProductModal`, `QuickCreatePartnerModal`, `QuickCreateCategoryModal`, `QuickCreateLocationModal`.
- **`initialName` prop** — All quick-create modals accept `initialName?: string` to pre-fill the name field when triggered from a search input.
- **Partner details page** — `src/app/(dashboard)/partners/[id]/page.tsx` uses React Query, edit mode state, `PartnerDetailsHeader` + `PartnerDetailsInfoCard` + `PartnerDetailsTabs`.
- **PDF buttons on order headers** — Both `PODetailsHeader` and `SODetailsHeader` have Generate PDF / Download PDF logic. `purchaseOrderPDF` is `{ id, name }` object (not string). Download opens `${NEXT_PUBLIC_API_BASE_URL}/files/download/${id}` in new tab.

---

## Important Rules

1. **PO and SO share the same backend API** (`/purchase-orders`) — differentiated by `orderType: "purchase" | "sales"`
2. **PO modals are reused by SO** — they accept an `orderType` prop to switch labels (Receipt/Shipment, Supplier/Customer, etc.)
3. **PurchaseOrderForm is reused for SO create/edit** — accepts `orderType` prop
4. **API field names stay as-is** (`poNumber`, `supplier`, `receiptStatus`, `deliveredQuantity`) — only UI labels change for SO
5. **ErrorBoundary** wraps table and detail sections on all pages
6. **PageHeader** is sticky (`sticky top-[56px] lg:top-0`)
7. **Empty states** use the `EmptyState` component with icon, description, and CTA
8. **Column preferences** stored in localStorage (`po-column-prefs`, `so-column-prefs`)
9. **Force close status** comes from `remainingItems[].status === "forcefully closed"` with `closedBy` (user ID) and `closedAt` fields
10. **Mobile breakpoint** is `sm:` (640px) for most components, `lg:` (1024px) for table/card switching
