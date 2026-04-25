# To-Do List

Pending work, open issues, and planned roadmap items.
Last updated: 2026-04-25

> Completed features have been moved to [docs/features.md](./features.md).

---

## Code-Level Issues (Found in Codebase)

### Debug Console Statements

None remaining.

### Incomplete Features / Placeholder UI

| File | Line | Issue |
|------|------|-------|
| `src/components/purchase-orders/details/PODetailsTabs.tsx` | 147 | **Notifications tab** — Shows "Coming soon" placeholder |
| `src/components/sales-orders/details/SODetailsTabs.tsx` | 147 | **Notifications tab** — Shows "Coming soon" placeholder |


### Silent Error Handling

| File | Line | Context |
|------|------|---------|
| `src/components/products/ProductForm.tsx` | 289 | File upload error — no toast |
| `src/components/products/details/ProductDetailsHeader.tsx` | 58 | Archive product — no error toast |

---

## Priority Order (as of 2026-04-25)

> Ordered by user impact and build feasibility. Items marked 🔥 are workflow blockers for serious procurement teams.

### Immediate (Next 1–2 months)
1. 🔥 **Approval Workflows** — Biggest adoption blocker for teams with 5+ people
2. 🔥 **Invoice & Three-Way Matching** — PO → GRN → Invoice; required before finance can pay
3. 🔥 **Notifications tab** — Replace "Coming soon" on PO/SO detail pages
4. ⭐ **Invoice OCR (AI Phase 1)** — Upload invoice → Claude extracts line items; immediate daily ROI

### Short-term (Month 2–4)
6. **RFQ Module** — Pre-PO quotation workflow
7. **Payment Tracking** — Mark invoices as paid, track outstanding
8. **Bulk import** (CSV for products, partners)
9. **AI Chat sidebar** — Natural language queries over procurement data
10. **Price anomaly detection (AI Phase 2)** — Needs ~2 months of invoice data

### Medium-term (Month 4–8)
11. **Supplier scorecards** — On-time delivery %, price consistency
12. **Demand forecasting (AI Phase 3)** — Needs 6+ months of SO/PO history
13. **Cash flow forecast (AI Phase 3)**
14. **PO → SO linking**
15. **GST reconciliation + Tally integration**

### Long-term (Month 8+)
16. **Supplier Portal** — Long-term moat
17. **Process intelligence (AI Phase 4)** — Bottleneck analysis, health score
18. **Mobile app / PWA**

---

## Onboarding

- [x] **Onboarding wizard** — 5-step checklist on Dashboard (Location → Settings → Category → Partner → Product)
- [x] **Setup banner on Dashboard** — Shows incomplete steps with direct links
- [ ] **Contextual help icons** — `?` icons on complex features (Force Close, Payment Terms, GST)
- [ ] **In-app knowledge base** — Slide-out FAQ panel
- [ ] **Contextual prompts** — e.g. creating PO with no partners → "Add a partner first"

---

## Notifications

- [ ] **Build Notifications tab** — Replace "Coming soon" on PO/SO detail pages
- [ ] **In-app notifications** — Order status changes, receipts, delivery overdue
- [ ] **Email notifications** — Critical events (cancelled, overdue, approval needed)
- [ ] **WhatsApp/SMS** — Twilio/Interakt for Indian market; higher open rates than email
- [ ] **Notification preferences** — Per-user opt-in/out per event type

---

## 🔥 Approval Workflows

The single biggest blocker for mid-size companies adopting Aquio. Every procurement team with budget controls needs this.

- [ ] **Configurable approval thresholds** — Admin sets: PO above ₹X requires manager approval, above ₹Y requires finance
- [ ] **Multi-level approval chains** — Creator → Manager → Finance Director (up to 3 levels)
- [ ] **Approver assignment** — Per role or per user, configurable in Settings
- [ ] **Approval actions** — Approve with comment, reject with reason, delegate to another user
- [ ] **PO locked until approved** — Cannot be issued until all required approvals are granted
- [ ] **Approval dashboard** — Pending / approved / rejected view for approvers
- [ ] **Approval notifications** — Email + in-app when approval is needed or decision is made
- [ ] **Approval audit trail** — Who approved, when, with what comment — visible on order timeline
- [ ] **Escalation rules** — Auto-escalate if no action within N hours

---

## 🔥 Invoice & Three-Way Matching

Core finance workflow: match what was ordered → received → billed. Without this, finance cannot pay suppliers with confidence.

- [ ] **Invoice entity** — Upload supplier invoice PDF, enter invoice number, date, line items, total
- [ ] **Link invoice to PO** — One or multiple invoices per PO (partial billing supported)
- [ ] **Auto-match line items** — Compare invoice quantities/prices to PO and GRN
- [ ] **Match status** — `unmatched → partial → fully matched → approved for payment`
- [ ] **Mismatch alerts** — Flag when invoice amount > PO amount, or invoice qty > received qty
- [ ] **Invoice approval** — Finance approves matched invoice before payment
- [ ] **Invoice list view** — Filter by status, supplier, date range, PO number

---

## 🔥 RFQ (Request for Quotation) Module

The pre-PO workflow. Most SMB procurement tools skip this — it's a major differentiator.

- [ ] **Create RFQ** — Select products, quantities, required delivery date; add invited suppliers
- [ ] **Send RFQ to multiple suppliers** — Email notification with link to respond
- [ ] **Supplier quote submission** — Supplier enters unit prices, delivery date, validity
- [ ] **Quote comparison view** — Side-by-side table of all supplier quotes per product
- [ ] **Convert quote to PO** — One click to create PO from selected quote, pre-filling all fields
- [ ] **RFQ status** — Draft → Sent → Quotes Received → Closed / Converted
- [ ] **Quote validity tracking** — Alert if quote expires before PO is raised

---

## Payment Tracking

- [ ] **Payment terms on PO** — Already stored; now use it: compute expected payment date from GRN date
- [ ] **Payment milestones** — Advance, on-delivery, net-30 — configurable per PO
- [ ] **Record payment** — Mark payment made with date, amount, bank reference
- [ ] **Partial payment support** — Multiple payment entries per invoice
- [ ] **Outstanding payments dashboard** — Per supplier: total billed, total paid, overdue
- [ ] **Payment status on PO** — Unpaid / Partially Paid / Fully Paid badge
- [ ] **Overdue payment alerts** — Notify when payment due date passes

---

## Supplier Management (Beyond Basic CRUD)

- [ ] **Supplier scorecards** — On-time delivery %, quantity accuracy %, price consistency; auto-computed from order history
- [ ] **Supplier risk flags** — Manual tags: "under review", "preferred", "blacklisted"; visible on PO creation
- [ ] **GST number validation** — Real-time check against GST portal API; flag inactive registrations
- [ ] **Supplier document vault** — Store contracts, certificates, licenses with expiry date tracking
- [ ] **Contract management** — Upload rate contracts with validity dates and agreed prices per product
- [ ] **Contract price deviation alert** — Warn when a PO price deviates from contracted rate
- [ ] **Contract expiry reminders** — 90/60/30 days before expiry
- [ ] **Supplier onboarding workflow** — Request GST cert, PAN, bank details via a supplier form link

---

## Product & Catalog Intelligence

- [ ] **Supplier–product mapping** — Each product linked to approved suppliers with negotiated prices
- [ ] **Price history per product** — Show last 5 purchase prices per supplier on PO creation form
- [ ] **Preferred supplier** — Flag one supplier as preferred per product; auto-suggest on PO
- [ ] **Price deviation alert** — Warn if new PO price is >10% above historical average
- [ ] **Product catalog with standardized specs** — Custom attributes already exist; expose as searchable spec sheet
- [ ] **HSN code auto-suggest** — Suggest HSN codes based on product name/category using lookup
- [ ] **Reorder points** — Set min stock level per product; alert when stock drops below threshold
- [ ] **Reorder suggestions** — Auto-draft PO with preferred supplier + last-order quantity when stock hits reorder point

---

## Inventory Management

- [ ] **Stock ledger** — Running balance per product: received (from GRNs) minus shipped (from SOs)
- [ ] **Multi-warehouse stock** — Stock tracked per location, not just total
- [ ] **Stock valuation** — FIFO/LIFO/weighted average cost; total inventory value on dashboard
- [ ] **Stock transfer** — Move stock between locations with a transfer document
- [ ] **Physical stock count** — Record actual vs. system stock; generate variance report
- [ ] **Batch / lot tracking** — Track products by batch number for traceability (pharma, food)
- [ ] **Expiry tracking** — Set expiry dates on batches; alert before expiry
- [ ] **Goods Return** — Return to supplier with reason; creates negative GRN and debit note

---

## Quality Control

- [ ] **QC parameters per product** — Define what to inspect (dimensions, weight, visual defects)
- [ ] **QC checklist on GRN** — Warehouse marks pass/fail per parameter before accepting stock
- [ ] **Partial acceptance** — Accept some units, reject others; rejected qty goes to quarantine
- [ ] **Non-conformance report** — Record quality failures; notify supplier; track resolution
- [ ] **QC stats per supplier** — % of batches passing QC over time

---

## Analytics & Reporting

- [ ] **Spend analysis** — Total spend by supplier, category, time period, cost center
- [ ] **Savings tracking** — Compare actual price vs. budget/benchmark; highlight negotiated savings
- [ ] **On-time delivery report** — % of POs delivered on or before expected date, per supplier
- [ ] **Order cycle time** — Average days from PO creation to full GRN, per supplier/category
- [ ] **Budget vs. actuals** — Category-level spend against defined budgets
- [ ] **Pending actions dashboard** — Awaiting approval, overdue deliveries, unmatched invoices, expiring contracts — all in one view
- [ ] **Custom report builder** — Choose dimensions, metrics, date range; export to Excel/PDF
- [ ] **Scheduled reports** — Auto-email weekly/monthly spend summary to management

---

## Budget Management

- [ ] **Budget definition** — Set budgets by category, department, or cost center per financial period
- [ ] **Budget consumption tracking** — Real-time spend vs. budget; shown on PO creation
- [ ] **Budget alerts** — Warn at 80%, block at 100% (configurable)
- [ ] **Budget approval for overrun** — Exceeding budget triggers an approval before PO can proceed
- [ ] **Budget dashboard** — Visual breakdown of all active budgets with consumption %

---

## AI Layer

> Transforms Aquio from a transaction tool into an intelligent decision-support system.
> Architecture: Claude API (LLM) + vector DB (embeddings/semantic search) + ML service (Python/FastAPI for forecasting + anomaly detection) + AI Gateway module in NestJS.
> Build order: Phase 1 (LLM, no training data needed) → Phase 2 (statistical models, needs 2–3 months data) → Phase 3 (predictive + conversational) → Phase 4 (process intelligence).

### Phase 1 — Intelligent Document Processing (Start here, immediate ROI)

- [ ] **Invoice OCR & extraction** ⭐ *Start with this* — Upload invoice PDF/image → Claude API extracts vendor name, GSTIN, invoice number, date, line items, GST, total → pre-fills invoice form. Endpoint: `PATCH /invoices/:id/extract`. Eliminates manual invoice entry.
- [ ] **Contract intelligence** — Upload supplier rate contract → AI extracts agreed prices per SKU, validity period, payment conditions, penalty clauses, MOQs → stored as structured data; alerts when PO deviates from contract rates
- [ ] **Supplier quote parsing** — Paste or forward a supplier email quote → AI parses into structured RFQ response with line items, prices, delivery dates pre-filled
- [ ] **GRN from delivery challan** — Scan/upload paper delivery challan → AI reads product names, quantities, batch numbers → pre-fills GRN form

### Phase 1 — Conversational Procurement (Chat Interface)

- [ ] **AI chat sidebar** — Natural language assistant embedded in the sidebar; powered by Claude API + RAG over org's own procurement data
- [ ] **Query your data** — *"What did we spend on packaging in Q1?"*, *"Which suppliers delivered late more than twice?"*, *"Show unmatched invoices above ₹50,000"*
- [ ] **Take actions via chat** — *"Create a PO for 500kg steel pipes from Tata Steel, delivery by 15th May"*, *"Send RFQ for 1000 M8 bolts to approved suppliers"*
- [ ] **Alert explanations** — *"Why was this invoice flagged?"* → AI explains in plain English with supporting data points
- [ ] **Document drafting** — *"Write a payment reminder email to this supplier"*, *"Summarise this supplier's performance for last 6 months"*
- [ ] **Natural language search** — *"Show me all steel pipe orders from last quarter above ₹1L"* → AI translates to filters and executes

### Phase 2 — Anomaly Detection & Fraud Prevention (needs 2–3 months of data)

- [ ] **Duplicate invoice detection** — Flag invoices with same supplier + same amount + overlapping date range; blocking warning before approval; catches accidental double-submission and fraud
- [ ] **Price spike detection** — Compare PO/invoice unit price to 90-day moving average for that product/supplier; cross-supplier average; alert with deviation %
- [ ] **Split PO detection** — Flag multiple small POs to same supplier in short window that together exceed approval threshold (maverick buying workaround)
- [ ] **Quantity short-shipping detection** — Flag if a supplier consistently delivers 2–3% less than ordered across multiple GRNs
- [ ] **Bid collusion detection** — Flag when multiple RFQ quotes are suspiciously similar in price (within 1–2%) — possible supplier cartel
- [ ] **New supplier risk alert** — First PO to new supplier triggers review prompt and checklist
- [ ] **Supplier risk scoring** — Score based on: delivery delays, price volatility, GST compliance status, order concentration risk; shown on partner detail page

### Phase 2 — Smart Recommendations (needs data accumulation)

- [ ] **Supplier recommendation** — On PO creation: show ranked suppliers for each product with price, on-time %, and last purchase date. *"Tata Steel: best price+delivery. Essar: 4% cheaper but 40% late rate."*
- [ ] **Order consolidation suggestions** — Detect pending purchase requests that can be merged into one PO for freight savings or volume discounts
- [ ] **Optimal order quantity (EOQ)** — AI-computed quantity per product using consumption rate, holding cost, supplier MOQ, and demand variability; shown as suggestion on PO form
- [ ] **Auto-categorization** — New product added → AI suggests category + HSN code based on product name using Claude; user confirms
- [ ] **Spend consolidation** — *"You're buying this product from 4 suppliers. Consolidating to 2 gives negotiating leverage."*
- [ ] **Auto-approval for low-risk orders** — Learn patterns of repeat, always-approved orders → auto-approve below a threshold from trusted suppliers with audit trail note

### Phase 3 — Predictive Intelligence (needs 6+ months of data)

- [ ] **Demand forecasting** — Predict next 30/60/90 days procurement needs per product from SO history + seasonality + growth trend; shown as "Suggested POs" on dashboard
- [ ] **Price forecasting** — Integrate commodity price APIs (LME, MCX) for raw materials; *"Steel prices likely to rise 6–9% next month — consider forward buying"*
- [ ] **Lead time prediction** — Before raising PO: *"Based on 12 past deliveries, expect 8–11 days from this supplier, not their stated 7."* Adjusts delivery date expectations
- [ ] **Cash flow forecast** — From open POs + payment terms → project outgoing payments over next 30/60/90 days; timeline view for finance
- [ ] **Stockout risk prediction** — Current stock + consumption velocity + supplier lead time → *"You'll run out of M8 bolts in 12 days. Lead time is 8 days. Order now."*
- [ ] **Smart reorder suggestions** — AI-computed reorder point and quantity using consumption velocity + lead time variability per supplier; auto-draft PO when triggered
- [ ] **Seasonal buying patterns** — Detect and surface annual patterns: *"You typically buy 40% more packaging in October — consider early procurement."*

### Phase 4 — Process Intelligence (needs all modules running)

- [ ] **Bottleneck analysis** — *"Your average approval time is 3.4 days. 68% of delays are with one approver. Consider redistributing or setting escalation rules."*
- [ ] **Procurement health score** — Single 0–100 score per org: on-time delivery %, invoice match rate, budget adherence, approval SLA. Dashboard widget with drill-down.
- [ ] **Cycle time benchmarking** — Compare your PO-to-GRN cycle time against category averages
- [ ] **Smart notification prioritisation** — AI decides what's worth alerting vs. batching into daily digest; surface only what needs human action
- [ ] **Savings tracking** — Compare actual vs. benchmark/budget prices; compute negotiated savings over time
- [ ] **Spend clustering** — Auto-group similar ad-hoc purchases to suggest catalog consolidation opportunities

### AI Infrastructure (required across all phases)

- [ ] **AI Gateway module** (NestJS) — Single entry point routing to Claude API / embedding service / ML service; handles rate limiting, cost tracking, response caching, fallback on errors
- [ ] **Vector database** — Pinecone or pgvector; embed products, suppliers, POs for semantic search and RAG
- [ ] **Feature store** — Precomputed features updated asynchronously: supplier score, 90-day price avg, demand velocity, lead time stats; cached in Redis; AI reads from here not raw DB
- [ ] **ML service** (Python/FastAPI) — Demand forecasting (Prophet/ARIMA), anomaly detection (Isolation Forest), scoring models; separate lightweight service consumed by aquio-backend
- [ ] **AI cost dashboard** — Track Claude API + embedding API spend per feature; set budget alerts

---

## Supplier Portal

> Long-term moat. No small Indian procurement tool has done this well.

- [ ] **Supplier login** — Passwordless magic link per supplier email; no account creation friction
- [ ] **View open POs** — Supplier sees only their POs; can accept/reject with expected delivery date
- [ ] **Delivery schedule updates** — Supplier can update expected delivery date with reason
- [ ] **Invoice submission** — Supplier uploads invoice PDF directly; auto-linked to PO
- [ ] **Payment status visibility** — Supplier sees payment dates and references; reduces "when will I get paid?" calls
- [ ] **Supplier profile self-service** — Update bank details, GST cert, contact info
- [ ] **Communication thread** — Buyer and supplier exchange messages within the PO context

---

## Compliance & Audit

- [ ] **Audit log export** — Full activity log per order or per supplier, exportable to PDF/CSV
- [ ] **GSTR-2A reconciliation** — Match purchase invoices against GSTR-2A; flag missing/mismatched entries
- [ ] **E-way bill generation** — Auto-generate e-way bill for shipments above ₹50,000 via NIC API
- [ ] **TDS tracking** — Track TDS deductions on payments to suppliers above threshold
- [ ] **Vendor due diligence checklist** — Required documents before a supplier can receive a PO

---

## Data Quality

- [ ] **Duplicate partner detection** — Warn when adding supplier with same GST number or fuzzy-matched name
- [ ] **Duplicate product detection** — Same SKU or same HSN code
- [ ] **Bulk import** — CSV upload for products, partners, locations with validation and error report
- [ ] **Bulk export** — Export any list (products, orders, partners) to Excel with current filters applied
- [ ] **Data health dashboard** — Products without HSN, partners without GST, locations without address — list and fix

---

## UX & Quick Wins

- [ ] **Saved order templates** — Save any PO as a template; reuse with one click; only dates and PO number change
- [ ] **Duplicate PO detection** — Warn if same supplier + same products within 7 days already exists
- [ ] **PO expiry dates** — Some POs valid for 30 days only; auto-cancel if not confirmed by expiry
- [ ] **Bulk actions on list pages** — Select multiple orders → bulk cancel, export, or confirm
- [ ] **Print-friendly GRN** — Goods Receipt Note for warehouse to sign; separate from PO PDF
- [ ] **Mobile-optimised receipt entry** — Warehouse staff use phones; current form is desktop-only
- [ ] **Keyboard shortcuts** — G+P for products, G+O for orders, G+S for suppliers
- [ ] **Recently viewed** — Quick access to last 5 orders/products/suppliers from sidebar
- [ ] **Saved/pinned filters** — Save a filter set (e.g. "My overdue orders") and restore with one click
- [x] **Update copyright year** — Changed `© 2024` → `© 2025` on login and signup pages

---

## Performance

- [ ] **Virtualized lists** — react-virtual for tables with 100+ rows
- [ ] **Optimistic updates** — Cancel/Confirm/ForceClose update cache without waiting for server
- [ ] **Bundle analysis** — `@next/bundle-analyzer` to identify and split large chunks

---

## Platform & Growth

- [ ] **Public API with API keys** — Let customers build integrations
- [ ] **Webhooks** — Push events to customer systems on order status change, receipt, invoice match
- [ ] **White-labeling** — Custom logo, colors, domain for enterprise accounts
- [ ] **Multi-currency support** — USD, EUR, AED alongside INR; auto exchange rate fetch
- [ ] **Multi-entity support** — One login managing multiple subsidiaries/companies
- [ ] **Mobile app (PWA)** — Barcode scanning for GRN, offline mode for warehouse
- [ ] **Subscription billing** — Tiered plans (Starter / Growth / Enterprise) with feature gates
- [ ] **Usage analytics** — Track feature adoption; identify drop-off points for product improvement

---

## Security & Compliance

- [ ] **Two-factor authentication** — TOTP (Google Authenticator) or SMS OTP
- [ ] **Session management** — View active sessions, force logout from specific devices
- [ ] **IP whitelisting** — Enterprise accounts restrict access to office IPs
- [ ] **Data export for GDPR/compliance** — Full data export per organisation on request
- [ ] **Field-level encryption** — Encrypt sensitive fields (bank account numbers, tax IDs) at rest

---

## Integrations

- [ ] **Tally Prime** — Sync POs, GRNs, invoices to Tally ledgers automatically
- [ ] **GST portal** — Pull GSTR-2A for reconciliation; validate GSTIN in real time
- [ ] **Zoho Books / QuickBooks** — Accounting sync for non-Tally users
- [ ] **WhatsApp Business API** — Order confirmations, delivery alerts, payment reminders
- [ ] **Payment gateway** — Record payment + auto-reconcile with bank statement
- [ ] **Shiprocket / Delhivery** — Shipment tracking integration for outbound SO logistics
- [ ] **Slack / Teams** — Post order status changes, approval requests to channels

