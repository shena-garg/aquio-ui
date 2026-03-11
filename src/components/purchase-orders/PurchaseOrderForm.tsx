"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Lock,
  Plus,
  X,
  Paperclip,
  Loader2,
  Trash2,
  Search,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import {
  getVendorCompaniesWithLocations,
  getMyOrganization,
  getPOFormSettings,
  createPurchaseOrder,
  updatePurchaseOrder,
  getOrderForEdit,
  buildPartnerPayload,
  buildProductLine,
  searchProducts,
  calculateLineTotal,
  type VendorCompany,
  type Organization,
  type Location,
  type POFormSettings,
  type CreatePOPayload,
  type ProductSearchResult,
  type ProductVariant,
} from "@/services/purchaseOrderForm";

// ---------------------------------------------------------------------------
// Product row type
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string;
  product: ProductSearchResult | null;
  variant: ProductVariant | null;
  quantity: number;
  price: number;
}

let rowIdCounter = 0;
function nextRowId(): string {
  return `row-${++rowIdCounter}`;
}

function emptyRow(): ProductRow {
  return { id: nextRowId(), product: null, variant: null, quantity: 0, price: 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultDeliveryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 16);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type CompanyOption = (VendorCompany | Organization) & { _type: "vendor" | "own" };

function numberToIndianWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num: number): string {
    if (num >= 100) {
      return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + twoDigits(num % 100) : "");
    }
    return twoDigits(num);
  }

  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);
  const parts: string[] = [];

  let rem = intPart;
  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  if (crore > 0) parts.push(twoDigits(crore) + " Crore");
  if (lakh > 0) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand > 0) parts.push(twoDigits(thousand) + " Thousand");
  if (rem > 0) parts.push(threeDigits(rem));

  let result = parts.join(" ") || "Zero";
  if (n < 0) result = "Minus " + result;
  if (decPart > 0) result += " and " + twoDigits(decPart) + " Paise";
  return result;
}

function formatAddress(loc: Location): string {
  const a = loc.address;
  if (!a) return "";
  return [a.street, a.city, a.state, a.pincode, a.country]
    .filter(Boolean)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-[55px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
        <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
          <div className="h-8 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="h-8 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[10px] border border-[#e5e7eb] bg-white p-6 animate-pulse"
            >
              <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
              <div className="grid grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-3">
                    <div className="h-3 w-20 rounded bg-gray-200" />
                    <div className="h-9 w-full rounded bg-gray-200" />
                    <div className="h-3 w-28 rounded bg-gray-200" />
                    <div className="h-9 w-full rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Partner column sub-component
// ---------------------------------------------------------------------------

function PartnerCard({
  label,
  companies,
  selectedCompanyId,
  selectedLocationId,
  onCompanyChange,
  onLocationChange,
  disabled,
  headerRight,
}: {
  label: string;
  companies: CompanyOption[];
  selectedCompanyId: string;
  selectedLocationId: string;
  onCompanyChange: (id: string) => void;
  onLocationChange: (id: string) => void;
  disabled?: boolean;
  headerRight?: React.ReactNode;
}) {
  const company = companies.find((c) => c._id === selectedCompanyId);
  const locations = company?.locations ?? [];
  const location = locations.find((l) => l._id === selectedLocationId);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#111827]">
          {label}
        </span>
        {headerRight}
      </div>

      {/* Company dropdown */}
      <select
        value={selectedCompanyId}
        onChange={(e) => onCompanyChange(e.target.value)}
        disabled={disabled}
        className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select company</option>
        {companies.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
            {c._type === "own" ? " (Your Org)" : ""}
          </option>
        ))}
      </select>

      {/* Tax + Contact (company-level, fallback to location) */}
      {company ? (() => {
        const taxNum = (company as VendorCompany).taxNumber;
        const contactNum = company.phoneNumber || company.contactNumber || location?.contactNumber;
        const countryCodeVal = company.countryCode || location?.countryCode;
        if (!taxNum && !contactNum) return null;
        return (
          <p className="text-[11px] text-[#6b7280]">
            {[
              taxNum && `Tax: ${taxNum}`,
              contactNum && `${countryCodeVal ? `+${countryCodeVal}` : ""} ${contactNum}`.trim(),
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        );
      })() : (
        <p className="text-[11px] text-[#d1d5db]">Tax: —  ·  Contact: —</p>
      )}

      {/* Location dropdown */}
      <select
        value={selectedLocationId}
        onChange={(e) => onLocationChange(e.target.value)}
        disabled={disabled || locations.length === 0}
        className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">Select location</option>
        {locations.map((l) => (
          <option key={l._id} value={l._id}>
            {l.name}
          </option>
        ))}
      </select>

      {/* GST + Address (location-level, flat fields) */}
      {location ? (
        <div className="space-y-0.5">
          {location.gstNumber && location.gstNumber !== "-" && (
            <p className="text-[11px] text-[#6b7280]">
              GST: {location.gstNumber}
            </p>
          )}
          {(() => {
            const addrStr = [
              location.addressLine1,
              location.addressLine2,
              location.city,
              location.state && location.zip ? `${location.state} - ${location.zip}` : location.state || location.zip,
              location.country,
            ]
              .filter(Boolean)
              .join(", ");
            return addrStr ? (
              <p className="text-[11px] text-[#6b7280] leading-relaxed">{addrStr}</p>
            ) : null;
          })()}
        </div>
      ) : (
        <div className="space-y-0.5">
          <p className="text-[11px] text-[#d1d5db]">GST: —</p>
          <p className="text-[11px] text-[#d1d5db] leading-relaxed">Address will appear here</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product typeahead
// ---------------------------------------------------------------------------

function ProductTypeahead({
  value,
  onSelect,
  hasError,
}: {
  value: ProductSearchResult | null;
  onSelect: (p: ProductSearchResult) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value is cleared externally
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  function updateDropdownPosition() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  function handleSearch(term: string) {
    setQuery(term);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (term.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchProducts(term);
        setResults(res);
        updateDropdownPosition();
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleSelect(p: ProductSearchResult) {
    setQuery(p.name);
    setOpen(false);
    onSelect(p);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    function reposition() {
      updateDropdownPosition();
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const dropdownContent = open && (
    <div
      ref={(el) => {
        // Attach to wrapper for outside-click detection
      }}
      style={dropdownStyle}
      className="z-[9999] bg-white border border-[#e5e7eb] rounded-md shadow-lg max-h-48 overflow-y-auto"
    >
      {results.length > 0
        ? results.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-[13px] text-[#111827] hover:bg-[#f3f4f6]"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-[#9ca3af] ml-1.5 text-[11px]">
                {p.unitOfMeasurement} · GST {p.gst}%
              </span>
            </button>
          ))
        : !searching &&
          query.length >= 2 && (
            <div className="px-3 py-2 text-[13px] text-[#9ca3af]">
              No products found
            </div>
          )}
    </div>
  );

  return (
    <div ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search
          size={13}
          className="absolute left-2.5 text-[#9ca3af] pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              updateDropdownPosition();
              setOpen(true);
            }
          }}
          placeholder="Search product..."
          className={`w-full h-8 pl-7 pr-2.5 border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded text-[13px] text-[#111827] ${
            hasError ? "ring-1 ring-[#dc2626]" : ""
          }`}
        />
        {searching && (
          <Loader2
            size={13}
            className="absolute right-2.5 text-[#9ca3af] animate-spin"
          />
        )}
      </div>
      {dropdownContent}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface PurchaseOrderFormProps {
  editId?: string;
}

export function PurchaseOrderForm({ editId }: PurchaseOrderFormProps) {
  const isEditMode = !!editId;
  const router = useRouter();

  // ── Bootstrap data ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorCompany[]>([]);
  const [ownOrg, setOwnOrg] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<POFormSettings | null>(null);

  useEffect(() => {
    const promises: [
      Promise<VendorCompany[]>,
      Promise<Organization>,
      Promise<POFormSettings>,
      Promise<any> | Promise<null>,
    ] = [
      getVendorCompaniesWithLocations(),
      getMyOrganization(),
      getPOFormSettings(),
      editId ? getOrderForEdit(editId) : Promise.resolve(null),
    ];

    Promise.all(promises)
      .then(([v, org, s, editOrder]) => {
        setVendors(v);
        setOwnOrg(org);
        setSettings(s);

        if (editOrder) {
          populateFromOrder(editOrder, v, org);
        }
      })
      .catch(() => {
        toast.error("Failed to load form data. Please try again.");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ── Build unified company list ──────────────────────────────────────────
  const companies: CompanyOption[] = ownOrg
    ? [
        { ...ownOrg, status: "active" as const, _type: "own" },
        ...vendors.map((v) => ({ ...v, _type: "vendor" as const })),
      ]
    : vendors.map((v) => ({ ...v, _type: "vendor" as const }));

  // ── Partner state ───────────────────────────────────────────────────────
  const [supplierCompanyId, setSupplierCompanyId] = useState("");
  const [supplierLocationId, setSupplierLocationId] = useState("");
  const [consigneeCompanyId, setConsigneeCompanyId] = useState("");
  const [consigneeLocationId, setConsigneeLocationId] = useState("");
  const [buyerCompanyId, setBuyerCompanyId] = useState("");
  const [buyerLocationId, setBuyerLocationId] = useState("");
  const [sameAsConsignee, setSameAsConsignee] = useState(true);

  // Pre-select own org for consignee & buyer after load
  const didPreselect = useRef(false);
  useEffect(() => {
    if (!ownOrg || didPreselect.current) return;
    didPreselect.current = true;
    setConsigneeCompanyId(ownOrg._id);
    setBuyerCompanyId(ownOrg._id);
    if (ownOrg.locations.length > 0) {
      setConsigneeLocationId(ownOrg.locations[0]._id);
      setBuyerLocationId(ownOrg.locations[0]._id);
    }
  }, [ownOrg]);

  // Mirror buyer from consignee when checkbox is on
  useEffect(() => {
    if (sameAsConsignee) {
      setBuyerCompanyId(consigneeCompanyId);
      setBuyerLocationId(consigneeLocationId);
    }
  }, [sameAsConsignee, consigneeCompanyId, consigneeLocationId]);

  function handleCompanyChange(
    role: "supplier" | "consignee" | "buyer",
    id: string
  ) {
    const company = companies.find((c) => c._id === id);
    const defaultLoc = company?.locations?.[0]?._id ?? "";
    if (role === "supplier") {
      setSupplierCompanyId(id);
      setSupplierLocationId(defaultLoc);
    } else if (role === "consignee") {
      setConsigneeCompanyId(id);
      setConsigneeLocationId(defaultLoc);
    } else {
      setBuyerCompanyId(id);
      setBuyerLocationId(defaultLoc);
    }
  }

  // ── Original PO data (edit mode — never changes) ───────────────────────
  const originalPoNumber = useRef("");
  const originalStatus = useRef<string>("");

  // ── Populate form from existing order (edit mode) ──────────────────────
  function populateFromOrder(
    order: any,
    vendorList: VendorCompany[],
    org: Organization
  ) {
    // Partners
    if (order.supplier?.id) {
      setSupplierCompanyId(order.supplier.id);
      if (order.supplier.address?._id) setSupplierLocationId(order.supplier.address._id);
    }

    // Map buyer → consignee, biller → buyer in UI
    const buyerData = order.buyer ?? order.biller;
    const billerData = order.biller ?? order.buyer;
    if (buyerData?.id) {
      setConsigneeCompanyId(buyerData.id);
      if (buyerData.address?._id) setConsigneeLocationId(buyerData.address._id);
    }
    if (billerData?.id) {
      setBuyerCompanyId(billerData.id);
      if (billerData.address?._id) setBuyerLocationId(billerData.address._id);
    }

    // Check if buyer and biller are the same
    const buyerSame =
      buyerData?.id === billerData?.id &&
      buyerData?.address?._id === billerData?.address?._id;
    setSameAsConsignee(buyerSame);
    didPreselect.current = true;

    // Order details
    if (order.status) originalStatus.current = order.status;
    if (order.poNumber) {
      originalPoNumber.current = order.poNumber;
      setPoNumber(order.poNumber);
    }
    if (order.referenceId) setReferenceId(order.referenceId);
    if (order.supplierReferenceId) setSupplierRefId(order.supplierReferenceId);
    if (order.paymentTerms) setPaymentTerms(order.paymentTerms);
    if (order.notes) setNotes(order.notes);
    if (order.termsAndConditions) setTerms(order.termsAndConditions);

    // Dates (convert to YYYY-MM-DD)
    if (order.issueDate) {
      const d = new Date(order.issueDate);
      setIssueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    if (order.deliveryDate) {
      const d = new Date(order.deliveryDate);
      setDeliveryDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Files
    if (order.files && Array.isArray(order.files)) {
      setFiles(
        order.files.map((f: any) => ({
          id: f.id ?? f._id ?? "",
          name: f.name ?? f.fileName ?? "",
        }))
      );
    }

    // Products
    if (order.products && Array.isArray(order.products) && order.products.length > 0) {
      const rows: ProductRow[] = order.products.map((p: any) => {
        const productName = p.metadata?.product?.name ?? p.product?.name ?? "";
        const variantName = p.metadata?.variant?.name ?? p.variant?.name ?? "";
        const productId = p.product?._id ?? p.product?.id ?? "";
        const variantId = p.variant?._id ?? p.variant?.id ?? "";
        const uom = p.quantity?.postfix ?? "";
        const gst = p.gst?.value ?? 0;
        const qty = p.quantity?.value ?? 0;
        const price = typeof p.price?.value === "object"
          ? parseFloat(p.price.value.$numberDecimal ?? "0")
          : (p.price?.value ?? 0);

        const variant: ProductVariant = { _id: variantId, name: variantName };
        const product: ProductSearchResult = {
          _id: productId,
          name: productName,
          unitOfMeasurement: uom,
          gst,
          variants: [variant],
        };

        return {
          id: nextRowId(),
          product,
          variant,
          quantity: qty,
          price,
        };
      });
      setProductRows(rows);
    }
  }

  // ── Order details state ─────────────────────────────────────────────────
  const [poNumber, setPoNumber] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [supplierRefId, setSupplierRefId] = useState("");
  const [issueDate, setIssueDate] = useState(todayString());
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate());
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  function addTerm() {
    const v = termInput.trim();
    if (v && !terms.includes(v)) {
      setTerms((prev) => [...prev, v]);
    }
    setTermInput("");
  }

  function removeTerm(idx: number) {
    setTerms((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiClient.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploaded = res.data;
        setFiles((prev) => [
          ...prev,
          {
            id: uploaded.id ?? uploaded._id ?? "",
            name: uploaded.name ?? uploaded.fileName ?? file.name,
          },
        ]);
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Product rows ─────────────────────────────────────────────────────────
  const [productRows, setProductRows] = useState<ProductRow[]>([emptyRow()]);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Field-level errors — collected all at once on submit
  interface FieldErrors {
    supplier?: string;
    consignee?: string;
    buyer?: string;
    poNumber?: string;
    paymentTerms?: string;
    productsEmpty?: string;
    productsIncomplete?: string;
  }
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const incompleteRowIds = attempted
    ? new Set(
        productRows
          .filter(
            (r) =>
              (r.product && (!r.variant || r.quantity <= 0 || r.price <= 0)) ||
              (!r.product && (r.quantity > 0 || r.price > 0))
          )
          .map((r) => r.id)
      )
    : new Set<string>();

  function updateRow(id: string, patch: Partial<ProductRow>) {
    setProductRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function handleProductSelect(rowId: string, product: ProductSearchResult) {
    updateRow(rowId, { product, variant: null });
  }

  function addRow() {
    setProductRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    if (productRows.length <= 1) return;
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  }

  const totalAmount = productRows.reduce((sum, r) => {
    if (!r.product || r.quantity <= 0 || r.price <= 0) return sum;
    return sum + calculateLineTotal(r.quantity, r.price, r.product.gst);
  }, 0);

  const totalQuantity = productRows.reduce((sum, r) => {
    if (!r.product || r.quantity <= 0) return sum;
    return sum + r.quantity;
  }, 0);

  const productUoms = productRows
    .filter((r) => r.product && r.quantity > 0)
    .map((r) => r.product!.unitOfMeasurement);
  const allSameUom = productUoms.length > 0 && productUoms.every((u) => u === productUoms[0]);
  const commonUom = allSameUom ? productUoms[0] : null;

  // ── Submit ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(status?: "issued" | "draft") {
    setAttempted(true);
    setSubmitError("");

    const supplierCompany = companies.find(
      (c) => c._id === supplierCompanyId
    );
    const supplierLocation = supplierCompany?.locations.find(
      (l) => l._id === supplierLocationId
    );
    const consigneeCompany = companies.find(
      (c) => c._id === consigneeCompanyId
    );
    const consigneeLocation = consigneeCompany?.locations.find(
      (l) => l._id === consigneeLocationId
    );
    const buyerCompany = companies.find((c) => c._id === buyerCompanyId);
    const buyerLocation = buyerCompany?.locations.find(
      (l) => l._id === buyerLocationId
    );

    // Collect all errors at once
    const errors: FieldErrors = {};

    if (!supplierCompany || !supplierLocation) {
      errors.supplier = "Please select a supplier and location.";
    }
    if (!consigneeCompany || !consigneeLocation) {
      errors.consignee = "Please select a consignee and location.";
    }
    if (!buyerCompany || !buyerLocation) {
      errors.buyer = "Please select a buyer and location.";
    }
    if (!isEditMode && !settings?.generatePOAutomatically && !poNumber.trim()) {
      errors.poNumber = "PO Number is required.";
    }
    if (!paymentTerms) {
      errors.paymentTerms = "Payment terms is required.";
    }

    // Validate products
    const completeRows = productRows.filter(
      (r) => r.product && r.variant && r.quantity > 0 && r.price > 0
    );
    if (completeRows.length === 0) {
      errors.productsEmpty = "At least one product with quantity and price is required.";
    }

    // Check for incomplete rows (have product but missing data)
    const hasIncomplete = productRows.some(
      (r) =>
        (r.product && (!r.variant || r.quantity <= 0 || r.price <= 0)) ||
        (!r.product && (r.quantity > 0 || r.price > 0))
    );
    if (hasIncomplete) {
      errors.productsIncomplete = "All product rows must have a product, variant, quantity, and price.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const productLines = completeRows.map((r) =>
        buildProductLine(
          r.product!,
          r.variant!,
          r.quantity,
          r.product!.unitOfMeasurement,
          r.price,
          r.product!.gst
        )
      );

      const payload: any = {
        supplier: buildPartnerPayload(supplierCompany!, supplierLocation!),
        buyer: buildPartnerPayload(buyerCompany!, buyerLocation!),
        biller: buildPartnerPayload(buyerCompany!, buyerLocation!),
        referenceId,
        supplierReferenceId: supplierRefId,
        issueDate,
        deliveryDate,
        paymentTerms,
        termsAndConditions: terms,
        notes,
        products: productLines,
        orderType: "purchase",
        poNumber: isEditMode
          ? originalPoNumber.current
          : settings?.generatePOAutomatically
            ? ""
            : poNumber,
        files: files.map((f) => ({ id: f.id, name: f.name })),
      };
      // Only include status when explicitly provided (omit for issued/confirmed edits)
      if (status) {
        payload.status = status;
      }
      if (isEditMode && editId) {
        await updatePurchaseOrder(editId, payload);
        toast.success("Purchase order updated successfully.");
        router.push(`/purchase-orders/${editId}`);
      } else {
        const result = await createPurchaseOrder(payload);
        toast.success(
          status === "draft"
            ? "Purchase order saved as draft."
            : "Purchase order created and issued."
        );
        const newId = result?._id ?? result?.id;
        router.push(newId ? `/purchase-orders/${newId}` : "/purchase-orders");
      }
    } catch {
      setSubmitError(
        isEditMode
          ? "Failed to update purchase order. Please try again."
          : "Failed to create purchase order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return <FullPageSkeleton />;

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div className="flex h-[55px] flex-shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-6 sticky top-0 z-10">
        <span className="text-[18px] font-semibold text-[#111827]">
          {isEditMode ? "Edit Purchase Order" : "New Purchase Order"}
        </span>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {(submitError || Object.keys(fieldErrors).length > 0) && (
        <div className="flex items-start justify-between bg-[#fef2f2] border-b border-[#fecaca] px-6 py-2.5">
          <div className="flex flex-col gap-0.5">
            {submitError && (
              <span className="text-[13px] text-[#b91c1c]">{submitError}</span>
            )}
            {Object.values(fieldErrors).map((msg, i) => (
              <span key={i} className="text-[13px] text-[#b91c1c]">{msg}</span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setSubmitError(""); setFieldErrors({}); setAttempted(false); }}
            className="text-[#b91c1c] hover:text-[#991b1b] flex-shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="mx-4 pt-3 pb-6">
          {/* ── Partners card (full width) ────────────────────────────── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-2 mb-3">
            <div className="grid grid-cols-3 gap-4">
              <PartnerCard
                label="Supplier"
                companies={companies}
                selectedCompanyId={supplierCompanyId}
                selectedLocationId={supplierLocationId}
                onCompanyChange={(id) => handleCompanyChange("supplier", id)}
                onLocationChange={setSupplierLocationId}
              />
              <PartnerCard
                label="Consignee (Ship To)"
                companies={companies}
                selectedCompanyId={consigneeCompanyId}
                selectedLocationId={consigneeLocationId}
                onCompanyChange={(id) => handleCompanyChange("consignee", id)}
                onLocationChange={setConsigneeLocationId}
              />
              <PartnerCard
                label="Buyer (Bill To)"
                companies={companies}
                selectedCompanyId={buyerCompanyId}
                selectedLocationId={buyerLocationId}
                onCompanyChange={(id) => handleCompanyChange("buyer", id)}
                onLocationChange={setBuyerLocationId}
                disabled={sameAsConsignee}
                headerRight={
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsConsignee}
                      onChange={(e) => setSameAsConsignee(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#d1d5db] text-[#0d9488] focus:ring-[#0d9488]"
                    />
                    <span className="text-[11px] text-[#6b7280]">
                      Same as Consignee
                    </span>
                  </label>
                }
              />
            </div>
          </div>

          {/* ── Order Details card (full width) ─────────────────────── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-4 mb-3">
            <div className="grid grid-cols-4 gap-4">
              {/* PO Number */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  PO Number{" "}
                  {!settings?.generatePOAutomatically && (
                    <span className="text-[#dc2626]">*</span>
                  )}
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={poNumber}
                    disabled
                    className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-[#f9fafb] text-[13px] text-[#6b7280] cursor-not-allowed"
                  />
                ) : settings?.generatePOAutomatically ? (
                  <div className="flex items-center gap-2 w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-[#f9fafb] text-[13px] text-[#9ca3af]">
                    <Lock className="h-3.5 w-3.5" />
                    Auto-generated
                  </div>
                ) : (
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Enter PO number"
                    className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                  />
                )}
              </div>

              {/* Reference ID */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Reference ID
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Enter reference ID"
                  className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>

              {/* Supplier Ref ID */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Supplier Reference ID
                </label>
                <input
                  type="text"
                  value={supplierRefId}
                  onChange={(e) => setSupplierRefId(e.target.value)}
                  placeholder="Enter supplier ref ID"
                  className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Payment Terms <span className="text-[#dc2626]">*</span>
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className={`w-full h-9 border rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white ${
                    fieldErrors.paymentTerms ? "border-[#dc2626]" : "border-[#e5e7eb]"
                  }`}
                >
                  <option value="">Select payment terms</option>
                  {(settings?.paymentTerms ?? []).map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
                {fieldErrors.paymentTerms && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{fieldErrors.paymentTerms}</p>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Issue Date <span className="text-[#dc2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={issueDate}
                    max={todayString()}
                    onChange={(e) => {
                      setIssueDate(e.target.value);
                      if (deliveryDate < e.target.value) {
                        setDeliveryDate(e.target.value);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-between h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-white cursor-pointer">
                    <span className="text-[13px] text-[#111827]">
                      {issueDate
                        ? new Date(issueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "Select date"}
                    </span>
                    <CalendarDays className="h-4 w-4 text-[#6b7280]" />
                  </div>
                </div>
              </div>

              {/* Delivery Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Delivery Date <span className="text-[#dc2626]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deliveryDate}
                    min={issueDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-between h-9 border border-[#e5e7eb] rounded-[6px] px-3 bg-white cursor-pointer">
                    <span className="text-[13px] text-[#111827]">
                      {deliveryDate
                        ? new Date(deliveryDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "Select date"}
                    </span>
                    <CalendarDays className="h-4 w-4 text-[#6b7280]" />
                  </div>
                </div>
              </div>

              {/* Internal Notes — spans 2 columns */}
              <div className="col-span-2">
                <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                  className="w-full border border-[#e5e7eb] rounded-[6px] px-3 py-2 text-[13px] text-[#111827] resize-none outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>
            </div>
          </div>
              {/* Products table */}
              <div className="rounded-[10px] bg-white">
                <div className="border border-[#e5e7eb] rounded-[8px] overflow-hidden">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] text-left text-[13px] font-medium text-[#111827] bg-[#fafafa] divide-x divide-[#e5e7eb]">
                        <th className="h-10 px-3" style={{ width: "28%" }}>Product</th>
                        <th className="h-10 px-3" style={{ width: "16%" }}>Variant</th>
                        <th className="h-10 px-3 text-right" style={{ width: "16%" }}>Quantity</th>
                        <th className="h-10 px-3 text-right" style={{ width: "14%" }}>Unit Price</th>
                        <th className="h-10 px-3 text-right" style={{ width: "8%" }}>GST%</th>
                        <th className="h-10 px-3 text-right" style={{ width: "14%" }}>Line Total</th>
                        <th className="h-10 px-2" style={{ width: "4%" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row) => {
                        const hasProduct = !!row.product;
                        const gst = row.product?.gst ?? 0;
                        const uom = row.product?.unitOfMeasurement ?? "";
                        const lineTotal =
                          hasProduct && row.quantity > 0 && row.price > 0
                            ? calculateLineTotal(row.quantity, row.price, gst)
                            : 0;

                        return (
                          <tr
                            key={row.id}
                            className={`border-b hover:bg-[#fafafa] transition-colors divide-x divide-[#e5e7eb] ${
                              incompleteRowIds.has(row.id)
                                ? "border border-red-400 bg-[#fef2f2]"
                                : "border-[#f3f4f6]"
                            }`}
                          >
                            {/* Product */}
                            <td className="h-10 px-1">
                              <ProductTypeahead
                                value={row.product}
                                onSelect={(p) =>
                                  handleProductSelect(row.id, p)
                                }
                                hasError={attempted && !row.product}
                              />
                            </td>

                            {/* Variant */}
                            <td className="h-10 px-1">
                              <select
                                value={row.variant?._id ?? ""}
                                title={row.variant?.name ?? ""}
                                onChange={(e) => {
                                  const v = row.product?.variants.find(
                                    (v) => v._id === e.target.value
                                  );
                                  if (v) updateRow(row.id, { variant: v });
                                }}
                                disabled={!hasProduct}
                                className={`w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                  attempted && hasProduct && !row.variant
                                    ? "ring-1 ring-[#dc2626]"
                                    : ""
                                }`}
                              >
                                <option value="">Select</option>
                                {(row.product?.variants ?? []).map((v) => (
                                  <option key={v._id} value={v._id}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Quantity */}
                            <td className="h-10 px-1">
                              <div className="flex items-center gap-1" title={row.quantity > 0 ? numberToIndianWords(row.quantity) : ""}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.quantity === 0 ? "" : row.quantity.toLocaleString("en-IN")}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                                    updateRow(row.id, {
                                      quantity: raw ? parseFloat(raw) : 0,
                                    });
                                  }}
                                  disabled={!hasProduct}
                                  placeholder="0"
                                  className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] text-right disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                {uom && (
                                  <span className="text-[12px] text-[#9ca3af] flex-shrink-0">
                                    {uom}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className="h-10 px-1">
                              <div className="flex items-center gap-0.5" title={row.price > 0 ? numberToIndianWords(row.price) : ""}>
                                <span className="text-[13px] text-[#9ca3af] flex-shrink-0">₹</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.price === 0 ? "" : row.price.toLocaleString("en-IN")}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
                                    updateRow(row.id, {
                                      price: raw ? parseFloat(raw) : 0,
                                    });
                                  }}
                                  disabled={!hasProduct}
                                  placeholder="0"
                                  className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] text-right disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </div>
                            </td>

                            {/* GST% */}
                            <td className="h-10 px-3 text-right">
                              <span className="text-[13px] text-[#9ca3af]">
                                {hasProduct ? `${gst}%` : "—"}
                              </span>
                            </td>

                            {/* Line Total */}
                            <td className="h-10 px-3 text-right" title={lineTotal > 0 ? numberToIndianWords(lineTotal) : ""}>
                              {lineTotal > 0 ? (
                                <span className="text-[13px] font-medium text-[#111827]">
                                  ₹{parseFloat(lineTotal.toFixed(2)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-[13px] text-[#9ca3af]">—</span>
                              )}
                            </td>

                            {/* Delete */}
                            <td className="h-10 pl-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                disabled={productRows.length <= 1}
                                className="p-1 text-[#9ca3af] hover:text-[#dc2626] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Add Product row */}
                      <tr>
                        <td colSpan={7} className="px-3 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addRow}
                            className="h-8 text-[13px] text-[#0d9488] border-[#0d9488] hover:bg-[#f0fdfa]"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Product
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                    {totalAmount > 0 && (
                      <tfoot>
                        <tr className="border-t border-[#e5e7eb]">
                          <td colSpan={2} />
                          <td className="h-10 px-3 text-right text-[13px] font-medium text-[#6b7280]" title={commonUom && totalQuantity > 0 ? numberToIndianWords(totalQuantity) : ""}>
                            {commonUom && totalQuantity > 0
                              ? `${totalQuantity.toLocaleString("en-IN")} ${commonUom}`
                              : ""}
                          </td>
                          <td />
                          <td className="h-10 px-3 text-right text-[14px] font-semibold text-[#111827]">
                            Total
                          </td>
                          <td className="h-10 px-3 text-right text-[14px] font-semibold text-[#111827]" title={numberToIndianWords(totalAmount)}>
                            ₹{parseFloat(totalAmount.toFixed(2)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                {(fieldErrors.productsEmpty || fieldErrors.productsIncomplete) && (
                  <p className="text-[12px] text-[#dc2626] mt-1.5 px-1">
                    {fieldErrors.productsEmpty || fieldErrors.productsIncomplete}
                  </p>
                )}
              </div>

              {/* Terms & Attachments side by side */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Terms & Conditions */}
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-5">
                  <label className="block text-[13px] font-medium text-[#111827] mb-2">
                    Terms & Conditions
                  </label>
                  <div>
                    {terms.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-[#f3f4f6]"
                      >
                        <span className="text-[13px] text-[#111827]">{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTerm(i)}
                          className="text-[#9ca3af] hover:text-[#dc2626] transition-colors flex-shrink-0 ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 mt-2">
                      <input
                        type="text"
                        value={termInput}
                        onChange={(e) => setTermInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTerm();
                          }
                        }}
                        placeholder="+ Add term"
                        className="w-full h-8 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                      />
                      {termInput.trim() && (
                        <button
                          type="button"
                          onClick={addTerm}
                          className="text-[#0d9488] hover:text-[#0f766e] transition-colors flex-shrink-0"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-5">
                  <label className="block text-[13px] font-medium text-[#111827] mb-2">
                    Attachments
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.id}-${idx}`}
                        className="flex items-center gap-1.5 bg-[#f3f4f6] rounded px-2 py-1"
                      >
                        <Paperclip size={12} className="text-[#6b7280]" />
                        <span className="text-[12px] text-[#111827]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-[#9ca3af] hover:text-[#dc2626] transition-colors ml-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1 text-[13px] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      {isUploading ? "Uploading..." : "Attach"}
                    </button>
                    <span className="text-[11px] text-[#9ca3af]">Max 10MB per file</span>
                  </div>
                </div>
              </div>

          {/* ── Bottom action bar ─────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(isEditMode && editId ? `/purchase-orders/${editId}` : "/purchase-orders")}
              disabled={submitting}
              className="h-8 text-[13px]"
            >
              Cancel
            </Button>
            {isEditMode && (originalStatus.current === "issued" || originalStatus.current === "confirmed") ? (
              <Button
                size="sm"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit("draft")}
                  disabled={submitting}
                  className="h-8 text-[13px]"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Save as Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmit("issued")}
                  disabled={submitting}
                  className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  {isEditMode ? "Save & Issue" : "Create & Issue"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
