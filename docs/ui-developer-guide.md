# Aquio UI — Developer Guide

> Coding practices, conventions, and patterns for contributors to `aquio-ui`.
> Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, React Query, Zod.
> Last updated: 2026-05-09

---

## 1. Project Structure

```
src/
├── app/(auth)/            # Public pages: login, signup, forgot-password, reset-password, set-password, verify-email
├── app/(dashboard)/       # All protected pages — wrapped by AuthProvider + Sidebar + RouteGuard
├── components/
│   ├── ui/                # Shared primitives: shadcn/ui + custom (CustomSelect, ErrorBoundary, EmptyState, PageHeader)
│   ├── layout/            # Sidebar, PageHeader
│   ├── auth/              # RequirePermission, RouteGuard, AccessDenied
│   ├── activity/          # SimpleActivityTimeline and supporting cards
│   └── {feature}/         # Feature components (purchase-orders, sales-orders, products, users, etc.)
├── services/              # One file per entity — all API calls live here, nowhere else
├── contexts/              # AuthContext (auth state, permissions, user/role)
├── hooks/                 # usePermissions (thin wrapper over AuthContext)
└── lib/
    ├── api-client.ts      # Axios instance with JWT interceptor + 401 redirect
    ├── utils.ts           # cn() helper
    ├── route-permissions.ts
    └── uom.ts
```

**Rule:** Feature components go under `src/components/{feature}/`. Pages contain layout and data-fetching only — not business UI logic.

---

## 2. Pages vs. Components

- **Pages** (`app/(dashboard)/{route}/page.tsx`) — responsible for: routing params, top-level React Query calls, layout, and wiring props to components. No inline JSX business logic beyond layout.
- **Components** — reusable UI pieces. Receive data as props. Do their own sub-queries only when lazy-loading (e.g. tabs that query only when active).
- All interactive components must include `"use client"` at the top. Server components are not used in `(dashboard)`.

---

## 3. Data Fetching — React Query

All server state lives in React Query. Never `useEffect` + `useState` for API data.

```tsx
const { data, isLoading, isError } = useQuery({
  queryKey: ["products"],
  queryFn: () => productsService.list(params).then((r) => r.data),
  staleTime: 2 * 60 * 1000,
});
```

### staleTime conventions

| Data type | staleTime |
|---|---|
| Orders, users, partners, products | `2 * 60 * 1000` (2 min) |
| Roles | `5 * 60 * 1000` (5 min) |
| Categories, org settings | `10 * 60 * 1000` (10 min) |
| Activity feeds (always fresh) | `0` |

### After mutations

Always invalidate affected query keys:

```tsx
await productsService.update(id, payload);
queryClient.invalidateQueries({ queryKey: ["product", id] });
queryClient.invalidateQueries({ queryKey: ["products"] });
```

### Auto-refresh for live pages

List and detail pages for orders use `refetchInterval: 30 * 1000` so changes made by other users appear without a manual refresh.

---

## 4. Services Layer

Every API call goes through a service file in `src/services/`. No `apiClient` calls anywhere else.

```ts
// src/services/products.ts
export const productsService = {
  list: (params) => apiClient.get<ProductsResponse>("/products", { params }),
  getById: (id: string) => apiClient.get<Product>(`/products/${id}`),
  create: (payload: CreateProductPayload) => apiClient.post("/products", payload),
  update: (id: string, payload: Partial<CreateProductPayload>) =>
    apiClient.patch(`/products/${id}`, payload),
};
```

**Rules:**
- Service objects exported as `const xxxService = { ... }`
- Always type the generic: `apiClient.get<ResponseType>(url)`
- Never construct URLs with string concatenation in components — that belongs in the service file

---

## 5. TypeScript

- `interface` for data models and component props
- `type` for union types (`POOrderStatus`, `POFilterStatus`)
- Strict mode is on — no `any` unless absolutely necessary (use `unknown` and narrow)
- Path alias `@/` resolves to `src/` — always use it, never relative `../../`
- Component prop interfaces are defined in the same file as the component, not in a separate types file unless shared

---

## 6. Styling

### Tailwind conventions

- Use Tailwind utility classes exclusively — no CSS modules, no inline styles
- Use `cn()` from `@/lib/utils` for conditional class merging:

```tsx
className={cn("base-classes", condition && "conditional-class", className)}
```

### Color palette

| Use | Value |
|---|---|
| Primary action / teal accent | `#0d9488` (hover: `#0f766e`) |
| Destructive / delete | `#dc2626` |
| Force close / warning orange | `#ea580c` |
| Page background | `#f9fafb` |
| Card background | `white` |
| Border default | `#e5e7eb` |
| Body text | `#0F1720` |
| Secondary text | `#6b7280` |
| Active badge | `bg-[#d1fae5] text-[#065f46]` |
| Inactive badge | `bg-[#f3f4f6] text-[#374151]` |

### Text sizes

- Page title: `text-[18px] font-semibold`
- Table header: `text-[11px] font-semibold uppercase tracking-wider text-gray-400`
- Body / labels: `text-[13px]`
- Sub-labels / timestamps: `text-[12px]` or `text-[11px]`

---

## 7. Select / Dropdown Components

**Rule: Never use native `<select>`. Zero native `<select>` elements exist in this codebase.**

### Simple option lists → `CustomSelect`

```tsx
import { CustomSelect } from "@/components/ui/CustomSelect";

<CustomSelect
  value={roleId}
  onChange={setRoleId}
  options={roles.map((r) => ({ value: r._id, label: r.name }))}
  placeholder="Select role"
  disabled={isSubmitting}
  error={!!errors.roleId}
  className="h-8"
/>
```

Props: `value`, `onChange`, `options: { value, label, disabled? }[]`, `placeholder`, `disabled`, `error` (red border), `className`.

Uses `getBoundingClientRect` + `position: fixed` — safe inside modals, overflow containers, and sticky headers.

### Searchable / typeahead → custom implementation

Follow the `ProductTypeahead` / `PaymentTermsTypeahead` pattern in `PurchaseOrderForm.tsx`. Key requirements:
- Fixed positioning via `getBoundingClientRect`
- Reposition on scroll and resize while open
- `onCreateNew?: (query: string) => void` prop for inline quick-create trigger

---

## 8. Forms

All forms use React Hook Form + Zod validation:

```tsx
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: "", email: "" },
});
```

On submit, wrap the API call in try/catch and set a `submitError` string for display under the form. Never use `alert()`.

---

## 9. Auth & Permissions

### Checking permissions inline

```tsx
const { hasPermission } = useAuth();
if (!hasPermission("purchase-order.create")) { ... }
```

### Hiding UI elements

```tsx
<RequirePermission permission="purchase-order.cancel">
  <Button onClick={handleCancel}>Cancel</Button>
</RequirePermission>
```

### Route-level protection

`RouteGuard` in the dashboard layout handles this automatically. Register new routes in `src/lib/route-permissions.ts`.

### Session polling

`AuthContext` refetches `/users/my-own` and the user's role every 2 minutes (tab active only). If `user.status` becomes `"inactive"`, the session is force-logged out immediately. Permission/role changes propagate without a hard refresh.

---

## 10. Error Handling

- **Never** use try/catch inside React Query `queryFn` — React Query catches errors automatically and sets `isError`
- For mutations (create, update, delete), wrap in try/catch and set a `submitError` state string
- Display `submitError` as a small red message (`text-[13px] text-[#dc2626]`) near the submit button, not as a toast
- Use `toast.success()` / `toast.error()` for completion feedback after navigation or for ephemeral messages

```tsx
const [submitError, setSubmitError] = useState("");

async function handleSubmit() {
  try {
    await productsService.create(payload);
    toast.success("Product created.");
    router.push("/products");
  } catch (err) {
    const message = (err as ApiError)?.response?.data?.message ?? "Something went wrong.";
    setSubmitError(message);
  }
}
```

---

## 11. Loading & Empty States

### Skeletons

Every page that fetches data must show a skeleton while loading — never a spinner-only full-page loader for initial load. Match the shape of the real content. Use `animate-pulse` with `bg-gray-200` placeholder divs.

### Empty states

Use the shared `EmptyState` component:

```tsx
<EmptyState
  icon={<PackageOpen className="h-6 w-6 text-[#0d9488]" />}
  title="No products yet"
  description="Add your first product to start tracking orders."
  actionLabel="Add Product"
  onAction={() => router.push("/products/new")}
/>
```

### Error states

For full-page errors (query failed), show a centered message with a "Go Back" button. Wrap data sections in `<ErrorBoundary>`.

---

## 12. Detail Page Pattern

All entity detail pages follow the same structure. Use Partner Details or User Details as the canonical reference.

```
PageHeader (sticky, title + status badge + actions)
  ↓
InfoCard (key facts in a grid, read-only or inline-edit mode)
  ↓
TabBar (scrollable, teal underline for active tab)
  ↓
TabContent (flex-1 overflow-auto, px-4 sm:px-8 py-4)
```

- Edit mode is **inline** — clicking Edit transforms the InfoCard into editable fields; Save/Cancel appear in the header. No separate `/edit` route.
- The `PageHeader` component is sticky (`sticky top-[56px] lg:top-0`).

---

## 13. Inline Quick-Create Modals

When a typeahead can't find what the user typed, offer to create it inline. Pattern:

1. Typeahead has `onCreateNew?: (query: string) => void` prop
2. Parent tracks `quickCreateOpen` and `quickCreateInitialName` state
3. Modal accepts `initialName?: string` to pre-fill the name field
4. On modal success: invalidate relevant query, set the new item as selected

Existing modals: `QuickCreateProductModal`, `QuickCreatePartnerModal`, `QuickCreateCategoryModal`, `QuickCreateLocationModal`.

---

## 14. Activity / Audit Trail

Use `SimpleActivityTimeline` for all activity feeds:

```tsx
import { SimpleActivityTimeline } from "@/components/activity/SimpleActivityTimeline";

<SimpleActivityTimeline
  events={events}       // AuditEvent[]
  users={users}         // User[] for resolving userId → name
  showEntityType={true} // true for cross-entity feeds (e.g. "Own Activity" tab)
/>
```

Fetch events:
- Events on an entity: `getEntityActivityLog("user" | "product" | ..., entityId)`
- Events by a user: `getUserActivityLog(userId)`

Always pair activity queries with `staleTime: 0` (always refetch). Show a Refresh button.

---

## 15. Mobile Responsiveness

- Mobile breakpoint for card/table switching: `sm:` (640px) and `lg:` (1024px)
- Desktop: `hidden lg:block` tables; Mobile: `lg:hidden` card lists
- All forms are single-column on mobile, multi-column on desktop
- Modals: `max-w-[560px]`, `p-0 gap-0` with manual header/footer sections
- `PageHeader` title truncates on small screens

---

## 16. Dark Mode

Dark mode is toggled from the sidebar user menu and stored in localStorage. Components use Tailwind's `dark:` variants only on the sidebar and top-level shell. Feature components do not implement dark mode variants individually.

---

## 17. Common Pitfalls

| Pitfall | Correct approach |
|---|---|
| Using native `<select>` | Always use `CustomSelect` |
| `useEffect` for API data | Use React Query |
| Calling `apiClient` directly in a component | Put it in a service file first |
| Using relative imports (`../../services`) | Use `@/services/...` |
| Hard-coding colours as hex in JSX | Use Tailwind classes from the palette above |
| `router.push` while a click interceptor is active | Reset state that causes the interceptor before navigating (see Settings page `handleDiscardAndLeave`) |
| Forgetting to stop event propagation on action menus inside clickable rows | `onClick={(e) => e.stopPropagation()}` on the menu cell |
| Passing `userId` / `organizationId` as function parameters | These come from `AuthContext` / RequestContext — never pass them around |
