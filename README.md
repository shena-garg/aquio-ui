# Aquio UI

Aquio is a B2B SaaS platform for managing purchase orders, sales orders, products, partners, and inventory. This is the frontend application.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| Data Fetching | React Query (TanStack Query 5) |
| HTTP Client | Axios |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Notifications | Sonner |

## Prerequisites

- Node.js 18+
- npm 9+

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/shena-garg/aquio-ui.git
cd aquio-ui
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```
NEXT_PUBLIC_API_BASE_URL=https://beta-backend.aquio.ai
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm run start
```

### 6. Type check

```bash
npx tsc --noEmit
```

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Public pages (login, signup)
│   └── (dashboard)/        # Protected pages (all main features)
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── layout/             # PageHeader, Sidebar
│   ├── auth/               # RequirePermission, RouteGuard
│   ├── purchase-orders/    # PO list, details, modals, form
│   ├── sales-orders/       # SO list, details (mirrors PO)
│   ├── products/           # Product list, details, form
│   ├── partners/           # Partner list
│   ├── locations/          # Location list, form
│   ├── users/              # User list, form
│   ├── roles/              # Role list, form
│   ├── categories/         # Category accordion
│   └── activity/           # Audit trail timeline
├── services/               # API service layer (one file per entity)
├── contexts/               # React Context (AuthContext)
├── hooks/                  # Custom hooks (usePermissions)
└── lib/                    # Utilities (api-client, cn, route-permissions)
```

## Key Features

- **Purchase Orders** — Create, edit, track receipts, force close products
- **Sales Orders** — Same functionality as PO with shipment tracking
- **Products** — Catalog with variants, custom attributes, analytics
- **Partners** — Vendor/customer management with locations
- **Dashboard** — KPIs, charts, spend vs revenue analysis
- **Role-Based Access** — Granular permissions per entity and action
- **Responsive** — Mobile-first design with card layouts on small screens
- **Activity Trail** — Audit log with detailed change tracking

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `https://beta-backend.aquio.ai` |
