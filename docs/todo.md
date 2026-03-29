# To-Do List

Consolidated list of all TODOs, incomplete features, code issues, and planned roadmap items.

---

## Code-Level Issues (Found in Codebase)

### TODOs in Code

| File | Line | Issue |
|------|------|-------|
| `src/app/(auth)/signup/page.tsx` | 46 | `// TODO: Replace with actual signup API call` — Sign-up form logs payload to console, no API integration |

### Debug Console Statements (Should Remove)

| File | Line | Statement |
|------|------|-----------|
| `src/app/(auth)/signup/page.tsx` | 47 | `console.log("Signup payload:", values)` |
| `src/components/purchase-orders/modals/ReceiptFormModal.tsx` | 230 | `console.log("orderId:", orderId)` |

### Incomplete Features / Placeholder UI

| File | Line | Issue |
|------|------|-------|
| `src/components/purchase-orders/details/PODetailsTabs.tsx` | 147 | **Notifications tab** — Shows "Coming soon" placeholder |
| `src/components/sales-orders/details/SODetailsTabs.tsx` | 147 | **Notifications tab** — Shows "Coming soon" placeholder |

### Outdated Content

| File | Line | Issue |
|------|------|-------|
| `src/app/(auth)/login/page.tsx` | 162 | Copyright says `© 2024` — should be updated |
| `src/app/(auth)/signup/page.tsx` | 219 | Copyright says `© 2024` — should be updated |

### Silent Error Handling

These `catch` blocks silently swallow errors without user feedback:

| File | Line | Context |
|------|------|---------|
| `src/components/products/ProductForm.tsx` | 289 | File upload error — no toast |
| `src/components/products/ProductForm.tsx` | 613 | Form submission — has toast but generic |
| `src/components/products/details/ProductDetailsExtra.tsx` | 75 | Save terms/description — no error toast |
| `src/components/products/details/ProductDetailsHeader.tsx` | 58 | Archive product — no error toast |
| `src/components/products/details/ProductDetailsTabs.tsx` | 472 | Variant operations — no error toast |

### ESLint Suppressions

Multiple `@typescript-eslint/no-explicit-any` suppressions in `ProductDetailsTabs.tsx` (lines 1225, 1349, 1425, 1597, 1836, 1939, 2029, 2121, 2856) — these indicate areas where proper typing could be added.

---

## Sign-Up & Auth

- [ ] **Wire up sign-up API** — Replace TODO placeholder with actual API call
- [ ] **Remove console.log** from sign-up form
- [ ] **Email verification flow** — Verify email after sign-up before allowing login
- [ ] **Password strength indicator** — Visual feedback during sign-up
- [ ] **Forgot password flow** — Login page links to `/forgot-password` but page doesn't exist

---

## Onboarding

### Phase 2: Guided Setup Wizard
After first login, show a checklist/wizard on Dashboard:
1. Company Details — Tax number, contact, address (pre-fill from sign-up)
2. Add Your First Location — Name, GST, address
3. Invite Team Members — Optional, skip allowed
4. Add Your First Partner — Name, tax number, location
5. Add Your First Product — Name, category, variant, unit, GST

Each step skippable. Progress bar. Can revisit.

### Phase 3: Organic Discovery
- Remove wizard once key steps done
- Contextual prompts: e.g., creating PO with no partners → "Add a partner first"

### Additional Onboarding Items
- [ ] **Checklist widget** — Persistent progress tracker on Dashboard
- [ ] **Contextual help icons** — `?` icons on complex features (Force Close, Payment Terms, GST)
- [ ] **In-app knowledge base** — `?` button → slide-out FAQ panel
- [ ] **Tooltip tours** — Lower priority. First-time tooltips via react-joyride or driver.js

---

## Notifications (Currently "Coming Soon")

- [ ] **Build Notifications tab** — PO and SO detail pages show "Coming soon"
- [ ] **In-app notifications** — Order status changes, receipts/shipments created, delivery overdue
- [ ] **Email/SMS notifications** — Critical events (cancelled, overdue)
- [ ] **Notification preferences** — Per-user settings

---

## Performance

- [ ] **Virtualization** — Add react-virtual/react-window if pagination limits exceed 50
- [ ] **Bundle analysis** — Run `next build` + `@next/bundle-analyzer`
- [ ] **Optimistic updates** — Cancel/Confirm/ForceClose could update React Query cache optimistically
- [ ] **Remove console.log/console.error debug statements** from production code

---

## Data Quality

- [ ] **Duplicate partner detection** — Same tax number, fuzzy name match
- [ ] **Duplicate product detection** — Same SKU, same HSN code
- [ ] **Bulk import** — CSV upload for products, partners, locations

---

## Analytics & Reporting (Q3)

- [ ] Supplier/Buyer performance scorecards (on-time delivery %, pricing trends)
- [ ] Spend analysis by category, supplier, time period
- [ ] Inventory forecasting based on PO/SO patterns
- [ ] Custom date range reports exportable as PDF
- [ ] Product-level analytics: purchase history, price trends across suppliers

---

## Approval Workflows (Q3)

- [ ] Configurable approval chains: PO above ₹X needs manager approval
- [ ] Multi-level approvals (creator → manager → finance)
- [ ] Approval dashboard: pending, approved, rejected
- [ ] Mobile push notifications for pending approvals

---

## Collaboration (Q3)

- [ ] Comments/notes on orders visible to team members
- [ ] @mentions in order notes
- [ ] Activity timeline commenting capability

---

## Integrations (Q4)

- [ ] Tally/accounting software sync
- [ ] GST portal integration (auto-fill GST, GSTR matching)
- [ ] WhatsApp/SMS notifications to suppliers/buyers
- [ ] Payment gateway integration for payment tracking
- [ ] E-way bill generation

---

## Automation (Q4)

- [ ] Auto-generate recurring POs/SOs (weekly/monthly reorder)
- [ ] Low stock alerts based on product movement
- [ ] Auto-reminders for overdue deliveries
- [ ] Template orders: save PO/SO as template, reuse with one click

---

## Advanced Features (Q4)

- [ ] Multi-currency support
- [ ] Multi-warehouse/location inventory tracking
- [ ] Quality check module: define QC parameters, record results on receipt
- [ ] Returns/credit notes management
- [ ] Full PO-SO linking traceability (partially exists)

---

## Platform & Growth (Q5)

- [ ] Public API with API keys for customers
- [ ] Webhooks for external system integration
- [ ] Audit log export for compliance
- [ ] White-labeling (custom logo, colors for enterprise)
- [ ] Mobile app (React Native or PWA) with barcode scanning + offline mode
- [ ] In-app knowledge base / help center
- [ ] Multi-tenant billing and subscription management
- [ ] Usage analytics (which features used, where users drop off)

---

## Security & Compliance (Cross-cutting)

- [ ] Two-factor authentication
- [ ] Session management (active sessions, force logout)
- [ ] Data export for GDPR/compliance
- [ ] IP whitelisting for enterprise

---

## UX Polish (Cross-cutting)

- [ ] Dark mode
- [ ] Keyboard shortcuts (G+P for products, G+O for orders)
- [ ] Saved/pinned filters per user
- [ ] Recently viewed orders/products
- [ ] Bulk actions on list pages (select multiple → cancel/confirm/export)
- [ ] Update copyright year from 2024

---

## Backend Rewrite

- [ ] **Rewrite backend in NestJS** — Module-by-module migration planned. See `docs/data-models.md` for schema blueprint and `docs/api-contracts.md` for endpoint contracts.

---

## Priority Order

1. Sign-up API integration + remove debug logs
2. Notifications tab (replace "Coming soon")
3. Onboarding wizard (Phase 2)
4. Approval workflows
5. Bulk import (CSV)
6. GST/Tally integration
7. Mobile app/PWA
