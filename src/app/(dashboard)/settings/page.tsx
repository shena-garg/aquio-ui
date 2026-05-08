"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X, Plus, ShoppingCart, TrendingUp, Package, Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { cn } from "@/lib/utils";
import {
  organizationSettingsService,
  OrganizationSettings,
} from "@/services/organization-settings";

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  {
    label: "Purchase Order",
    value: "po" as const,
    icon: <ShoppingCart className="h-4 w-4" />,
    short: "PO",
  },
  {
    label: "Sales Order",
    value: "so" as const,
    icon: <TrendingUp className="h-4 w-4" />,
    short: "SO",
  },
  {
    label: "Product",
    value: "product" as const,
    icon: <Package className="h-4 w-4" />,
    short: "Product",
  },
  {
    label: "Notifications",
    value: "notifications" as const,
    icon: <Bell className="h-4 w-4" />,
    short: "Notifs",
  },
];

type TabValue = (typeof TABS)[number]["value"];

// ── Shared input helpers ──────────────────────────────────────────────────────

function TagListInput({
  label,
  description,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    const val = inputValue.trim();
    if (!val || items.includes(val)) return;
    onChange([...items, val]);
    setInputValue("");
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {description && (
        <p className="text-[12px] text-gray-400 mb-2">{description}</p>
      )}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder ?? "Type and press Enter to add"}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          size="sm"
          className="h-[38px] px-3 bg-[#0d9488] hover:bg-[#0f766e] text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-gray-700"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  tooltip,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  tooltip?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {tooltip && <HelpTooltip content={tooltip} />}
        </div>
        {description && (
          <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-[#0d9488]" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function AutoNumberConfig({
  prefix,
  separator,
  nextNumber,
  onPrefixChange,
  onSeparatorChange,
  onNextNumberChange,
  previewLabel,
}: {
  prefix: string;
  separator: string;
  nextNumber: number;
  onPrefixChange: (v: string) => void;
  onSeparatorChange: (v: string) => void;
  onNextNumberChange: (v: number) => void;
  previewLabel?: string;
}) {
  return (
    <div className="ml-0 mt-3 rounded-lg bg-[#f9fafb] p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-[12px] font-medium text-gray-500">Prefix</label>
            <HelpTooltip content='Short code added before the number. e.g. "PO" → PO-001' side="top" />
          </div>
          <input
            type="text"
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
          />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-[12px] font-medium text-gray-500">Separator</label>
            <HelpTooltip content='Character placed between the prefix and number. e.g. "-" → PO-001, "/" → PO/001' side="top" />
          </div>
          <input
            type="text"
            value={separator}
            onChange={(e) => onSeparatorChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
          />
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-[12px] font-medium text-gray-500">Next Number</label>
            <HelpTooltip content="The number that will be used on the next order. Auto-increments after each creation." side="top" />
          </div>
          <input
            type="number"
            value={nextNumber}
            onChange={(e) => onNextNumberChange(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] text-gray-400">
          {previewLabel ?? "Preview"}:
        </span>
        <span className="text-[13px] font-medium text-[#111827]">
          {prefix}{separator}{nextNumber}
        </span>
      </div>
    </div>
  );
}

function GstListInput({
  items,
  onChange,
}: {
  items: number[];
  onChange: (items: number[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    const num = parseFloat(inputValue.trim());
    if (isNaN(num) || num < 0 || items.includes(num)) return;
    onChange([...items, num]);
    setInputValue("");
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Applicable GST Rates
      </label>
      <p className="text-[12px] text-gray-400 mb-2">
        Enter GST percentage values (numbers only, without % sign)
      </p>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) setInputValue(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="e.g. 18"
          className="w-40 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          size="sm"
          className="h-[38px] px-3 bg-[#0d9488] hover:bg-[#0f766e] text-white"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...items].sort((a, b) => a - b).map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-gray-700"
            >
              {item}%
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>("po");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: () => organizationSettingsService.getMyOwn().then((r) => r.data),
  });

  // ── Local state ──

  // PO
  const [poCancelReasons, setPoCancelReasons] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [isPOReferenceIDInternal, setIsPOReferenceIDInternal] = useState(false);
  const [generatePOAutomatically, setGeneratePOAutomatically] = useState(false);
  const [poPrefix, setPoPrefix] = useState("");
  const [poSeparator, setPoSeparator] = useState("");
  const [nextPONumber, setNextPONumber] = useState(1);

  // SO
  const [soCancelReasons, setSoCancelReasons] = useState<string[]>([]);
  const [soPaymentTerms, setSoPaymentTerms] = useState<string[]>([]);
  const [isSOReferenceIDInternal, setIsSOReferenceIDInternal] = useState(false);
  const [generateSOAutomatically, setGenerateSOAutomatically] = useState(false);
  const [soPrefix, setSoPrefix] = useState("");
  const [soSeparator, setSoSeparator] = useState("");
  const [nextSONumber, setNextSONumber] = useState(1);

  // Product
  const [applicableGst, setApplicableGst] = useState<number[]>([]);
  const [generateSKUAutomatically, setGenerateSKUAutomatically] = useState(false);
  const [skuPrefix, setSkuPrefix] = useState("");
  const [skuSeparator, setSkuSeparator] = useState("");
  const [nextSKUNumber, setNextSKUNumber] = useState(1);

  // Notifications
  const [notifPoDigest, setNotifPoDigest] = useState(true);
  const [notifSoDigest, setNotifSoDigest] = useState(true);

  const [saveError, setSaveError] = useState("");

  // ── Dirty check ──

  const isDirty =
    !!settings &&
    (JSON.stringify(poCancelReasons) !==
      JSON.stringify(settings.poCancelReasons ?? []) ||
      JSON.stringify(paymentTerms) !==
        JSON.stringify(settings.paymentTerms ?? []) ||
      isPOReferenceIDInternal !== (settings.isPOReferenceIDInternal ?? false) ||
      generatePOAutomatically !==
        (settings.generatePOAutomatically ?? false) ||
      poPrefix !== (settings.poPrefix ?? "") ||
      poSeparator !== (settings.poSeparator ?? "") ||
      nextPONumber !== (settings.nextPONumber ?? 1) ||
      JSON.stringify(soCancelReasons) !==
        JSON.stringify(settings.soCancelReasons ?? []) ||
      JSON.stringify(soPaymentTerms) !==
        JSON.stringify(settings.soPaymentTerms ?? []) ||
      isSOReferenceIDInternal !== (settings.isSOReferenceIDInternal ?? false) ||
      generateSOAutomatically !==
        (settings.generateSOAutomatically ?? false) ||
      soPrefix !== (settings.soPrefix ?? "") ||
      soSeparator !== (settings.soSeparator ?? "") ||
      nextSONumber !== (settings.nextSONumber ?? 1) ||
      JSON.stringify(applicableGst) !==
        JSON.stringify(settings.applicableGst ?? []) ||
      generateSKUAutomatically !==
        (settings.generateSKUAutomatically ?? false) ||
      skuPrefix !== (settings.skuPrefix ?? "") ||
      skuSeparator !== (settings.skuSeparator ?? "") ||
      nextSKUNumber !== (settings.nextSKUNumber ?? 1) ||
      notifPoDigest !== (settings.notificationPreferences?.overdueDigest?.po?.enabled ?? true) ||
      notifSoDigest !== (settings.notificationPreferences?.overdueDigest?.so?.enabled ?? true));

  // Warn on browser close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-app navigation when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href === "#") return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  const resetToServer = useCallback(() => {
    if (!settings) return;
    setPoCancelReasons(settings.poCancelReasons ?? []);
    setPaymentTerms(settings.paymentTerms ?? []);
    setIsPOReferenceIDInternal(settings.isPOReferenceIDInternal ?? false);
    setGeneratePOAutomatically(settings.generatePOAutomatically ?? false);
    setPoPrefix(settings.poPrefix ?? "");
    setPoSeparator(settings.poSeparator ?? "");
    setNextPONumber(settings.nextPONumber ?? 1);
    setSoCancelReasons(settings.soCancelReasons ?? []);
    setSoPaymentTerms(settings.soPaymentTerms ?? []);
    setIsSOReferenceIDInternal(settings.isSOReferenceIDInternal ?? false);
    setGenerateSOAutomatically(settings.generateSOAutomatically ?? false);
    setSoPrefix(settings.soPrefix ?? "");
    setSoSeparator(settings.soSeparator ?? "");
    setNextSONumber(settings.nextSONumber ?? 1);
    setApplicableGst(settings.applicableGst ?? []);
    setGenerateSKUAutomatically(settings.generateSKUAutomatically ?? false);
    setSkuPrefix(settings.skuPrefix ?? "");
    setSkuSeparator(settings.skuSeparator ?? "");
    setNextSKUNumber(settings.nextSKUNumber ?? 1);
    setNotifPoDigest(settings.notificationPreferences?.overdueDigest?.po?.enabled ?? true);
    setNotifSoDigest(settings.notificationPreferences?.overdueDigest?.so?.enabled ?? true);
  }, [settings]);

  const handleDiscardAndLeave = useCallback(() => {
    if (pendingNavUrl) {
      const url = pendingNavUrl;
      resetToServer();
      setPendingNavUrl(null);
      router.push(url);
    }
  }, [pendingNavUrl, router, resetToServer]);

  // Hydrate from API
  useEffect(() => {
    if (!settings) return;
    setPoCancelReasons(settings.poCancelReasons ?? []);
    setPaymentTerms(settings.paymentTerms ?? []);
    setIsPOReferenceIDInternal(settings.isPOReferenceIDInternal ?? false);
    setGeneratePOAutomatically(settings.generatePOAutomatically ?? false);
    setPoPrefix(settings.poPrefix ?? "");
    setPoSeparator(settings.poSeparator ?? "");
    setNextPONumber(settings.nextPONumber ?? 1);
    setSoCancelReasons(settings.soCancelReasons ?? []);
    setSoPaymentTerms(settings.soPaymentTerms ?? []);
    setIsSOReferenceIDInternal(settings.isSOReferenceIDInternal ?? false);
    setGenerateSOAutomatically(settings.generateSOAutomatically ?? false);
    setSoPrefix(settings.soPrefix ?? "");
    setSoSeparator(settings.soSeparator ?? "");
    setNextSONumber(settings.nextSONumber ?? 1);
    setApplicableGst(settings.applicableGst ?? []);
    setGenerateSKUAutomatically(settings.generateSKUAutomatically ?? false);
    setSkuPrefix(settings.skuPrefix ?? "");
    setSkuSeparator(settings.skuSeparator ?? "");
    setNextSKUNumber(settings.nextSKUNumber ?? 1);
    setNotifPoDigest(settings.notificationPreferences?.overdueDigest?.po?.enabled ?? true);
    setNotifSoDigest(settings.notificationPreferences?.overdueDigest?.so?.enabled ?? true);
  }, [settings]);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await organizationSettingsService.update({
        poCancelReasons,
        paymentTerms,
        isPOReferenceIDInternal,
        generatePOAutomatically,
        poPrefix,
        poSeparator,
        nextPONumber,
        soCancelReasons,
        soPaymentTerms,
        isSOReferenceIDInternal,
        generateSOAutomatically,
        soPrefix,
        soSeparator,
        nextSONumber,
        applicableGst,
        generateSKUAutomatically,
        skuPrefix,
        skuSeparator,
        nextSKUNumber,
        notificationPreferences: {
          overdueDigest: {
            po: { enabled: notifPoDigest },
            so: { enabled: notifSoDigest },
          },
        },
      });
      toast.success("Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save settings";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader title="Settings" />

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col w-[200px] flex-shrink-0 border-r border-gray-200 bg-white p-3 gap-0.5">
          <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Configure
          </p>
          {TABS.map((tab) => {
            const isActive = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-left transition-colors",
                  isActive
                    ? "bg-[#f0fdfa] text-[#0d9488]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#111827]"
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "text-[#0d9488]" : "text-gray-400"
                  )}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Tab strip — mobile only */}
          <div className="lg:hidden flex overflow-x-auto border-b border-gray-200 bg-white px-4">
            {TABS.map((tab) => {
              const isActive = tab.value === activeTab;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "border-[#0d9488] text-[#0d9488]"
                      : "border-transparent text-gray-500 hover:text-[#0F1720]"
                  )}
                >
                  {tab.short}
                </button>
              );
            })}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto bg-[#f9fafb]">
            <div className="mx-auto max-w-[680px] p-4 pb-8 sm:p-6 sm:pb-8">

              {/* ── Purchase Order ── */}
              {activeTab === "po" && (
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 sm:px-6 divide-y divide-[#f3f4f6]">
                  <div className="py-5 flex flex-col gap-4">
                    <Toggle
                      label="Auto-generate PO Number"
                      description="Automatically assign a sequential PO number when creating a new purchase order"
                      checked={generatePOAutomatically}
                      onChange={setGeneratePOAutomatically}
                    />
                    {generatePOAutomatically && (
                      <AutoNumberConfig
                        prefix={poPrefix}
                        separator={poSeparator}
                        nextNumber={nextPONumber}
                        onPrefixChange={setPoPrefix}
                        onSeparatorChange={setPoSeparator}
                        onNextNumberChange={setNextPONumber}
                        previewLabel="Next PO will be"
                      />
                    )}
                    <Toggle
                      label="PO Reference ID is Internal"
                      description="Hide the supplier reference ID field from external-facing documents"
                      tooltip="When on, the supplier's own reference number is treated as internal and won't appear on documents or emails shared with the supplier."
                      checked={isPOReferenceIDInternal}
                      onChange={setIsPOReferenceIDInternal}
                    />
                  </div>
                  <div className="py-5 flex flex-col gap-6">
                    <TagListInput
                      label="Payment Terms"
                      description="Available payment term options when creating a purchase order"
                      items={paymentTerms}
                      onChange={setPaymentTerms}
                      placeholder="e.g. Net 30"
                    />
                    <TagListInput
                      label="Cancel Reasons"
                      description="Predefined reasons shown when cancelling a purchase order"
                      items={poCancelReasons}
                      onChange={setPoCancelReasons}
                      placeholder="e.g. Contract Cancelled"
                    />
                  </div>
                </div>
              )}

              {/* ── Sales Order ── */}
              {activeTab === "so" && (
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 sm:px-6 divide-y divide-[#f3f4f6]">
                  <div className="py-5 flex flex-col gap-4">
                    <Toggle
                      label="Auto-generate SO Number"
                      description="Automatically assign a sequential SO number when creating a new sales order"
                      checked={generateSOAutomatically}
                      onChange={setGenerateSOAutomatically}
                    />
                    {generateSOAutomatically && (
                      <AutoNumberConfig
                        prefix={soPrefix}
                        separator={soSeparator}
                        nextNumber={nextSONumber}
                        onPrefixChange={setSoPrefix}
                        onSeparatorChange={setSoSeparator}
                        onNextNumberChange={setNextSONumber}
                        previewLabel="Next SO will be"
                      />
                    )}
                    <Toggle
                      label="SO Reference ID is Internal"
                      description="Hide the reference ID field from external-facing documents"
                      tooltip="When on, the customer's own reference number is treated as internal and won't appear on documents or emails shared with the customer."
                      checked={isSOReferenceIDInternal}
                      onChange={setIsSOReferenceIDInternal}
                    />
                  </div>
                  <div className="py-5 flex flex-col gap-6">
                    <TagListInput
                      label="Payment Terms"
                      description="Available payment term options when creating a sales order"
                      items={soPaymentTerms}
                      onChange={setSoPaymentTerms}
                      placeholder="e.g. 90 Days"
                    />
                    <TagListInput
                      label="Cancel Reasons"
                      description="Predefined reasons shown when cancelling a sales order"
                      items={soCancelReasons}
                      onChange={setSoCancelReasons}
                      placeholder="e.g. Contract expired"
                    />
                  </div>
                </div>
              )}

              {/* ── Product ── */}
              {activeTab === "product" && (
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 sm:px-6 divide-y divide-[#f3f4f6]">
                  <div className="py-5 flex flex-col gap-4">
                    <Toggle
                      label="Auto-generate Product Code (SKU)"
                      description="Automatically assign a sequential product code when creating a new product"
                      checked={generateSKUAutomatically}
                      onChange={setGenerateSKUAutomatically}
                    />
                    {generateSKUAutomatically && (
                      <AutoNumberConfig
                        prefix={skuPrefix}
                        separator={skuSeparator}
                        nextNumber={nextSKUNumber}
                        onPrefixChange={setSkuPrefix}
                        onSeparatorChange={setSkuSeparator}
                        onNextNumberChange={setNextSKUNumber}
                        previewLabel="Next code will be"
                      />
                    )}
                  </div>
                  <div className="py-5">
                    <GstListInput
                      items={applicableGst}
                      onChange={setApplicableGst}
                    />
                  </div>
                </div>
              )}

              {/* ── Notifications ── */}
              {activeTab === "notifications" && (
                <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 sm:px-6 divide-y divide-[#f3f4f6]">
                  <div className="py-5">
                    <p className="text-[13px] font-semibold text-[#374151] mb-1">Overdue Order Email Digest</p>
                    <p className="text-[12px] text-[#6b7280] mb-4">
                      A daily email is sent at 8:00 AM IST to all Administrator users listing overdue orders. Toggle off to stop sending for your organisation.
                    </p>
                    <div className="flex flex-col gap-4">
                      <Toggle
                        label="Purchase Order overdue digest"
                        description="Daily email listing overdue POs grouped by severity"
                        checked={notifPoDigest}
                        onChange={setNotifPoDigest}
                      />
                      <Toggle
                        label="Sales Order overdue digest"
                        description="Daily email listing overdue SOs grouped by severity"
                        checked={notifSoDigest}
                        onChange={setNotifSoDigest}
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <p className="px-5 sm:px-6 py-2 text-[13px] text-[#dc2626] border-t border-gray-200 bg-white">{saveError}</p>
          )}

          {/* Sticky save bar */}
          <div
            className={cn(
              "border-t border-gray-200 bg-white transition-all duration-200",
              isDirty ? "block" : "hidden"
            )}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="text-[13px] text-gray-600">
                  You have unsaved changes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToServer}
                  className="h-8 text-[13px] border-gray-200 text-gray-600"
                  disabled={isSaving}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-8 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
                >
                  {isSaving && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Unsaved changes nav warning */}
      <Dialog
        open={!!pendingNavUrl}
        onOpenChange={(open) => {
          if (!open) setPendingNavUrl(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[480px] p-0 gap-0"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Unsaved Changes
            </DialogTitle>
            <button
              onClick={() => setPendingNavUrl(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm text-gray-700">
              You have unsaved changes that will be lost if you leave this page.
              Would you like to stay and save first?
            </p>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleDiscardAndLeave}>
              Discard & Leave
            </Button>
            <Button
              onClick={() => setPendingNavUrl(null)}
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
            >
              Stay & Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
