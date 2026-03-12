"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  organizationSettingsService,
  OrganizationSettings,
} from "@/services/organization-settings";

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { label: "Purchase Order", value: "po" },
  { label: "Sales Order", value: "so" },
  { label: "Product", value: "product" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// ── Tag list input ───────────────────────────────────────────────────────────

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
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
          onKeyDown={handleKeyDown}
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
                onClick={() => handleRemove(i)}
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

// ── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
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

// ── Auto-number config ───────────────────────────────────────────────────────

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
  const preview = `${prefix}${separator}${nextNumber}`;

  return (
    <div className="ml-0 mt-3 rounded-lg bg-[#f9fafb] p-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-gray-500 mb-1">
            Prefix
          </label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-500 mb-1">
            Separator
          </label>
          <input
            type="text"
            value={separator}
            onChange={(e) => onSeparatorChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-500 mb-1">
            Next Number
          </label>
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
          {preview}
        </span>
      </div>
    </div>
  );
}

// ── GST input ────────────────────────────────────────────────────────────────

function GstListInput({
  items,
  onChange,
}: {
  items: number[];
  onChange: (items: number[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleAdd() {
    const val = inputValue.trim();
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;
    if (items.includes(num)) return;
    onChange([...items, num]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
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
          onKeyDown={handleKeyDown}
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
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[12px] text-gray-700"
            >
              {item}%
              <button
                type="button"
                onClick={() => handleRemove(i)}
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

// ── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>("po");
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: () => organizationSettingsService.getMyOwn().then((r) => r.data),
  });

  // ── Local state for all fields ──

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
  const [generateSKUAutomatically, setGenerateSKUAutomatically] =
    useState(false);
  const [skuPrefix, setSkuPrefix] = useState("");
  const [skuSeparator, setSkuSeparator] = useState("");
  const [nextSKUNumber, setNextSKUNumber] = useState(1);

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
      });
      toast.success("Settings saved successfully");
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save settings";
      toast.error(message);
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
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Settings"
        actions={
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
          >
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6">
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
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[700px] p-6">
          {/* ── Purchase Order ── */}
          {activeTab === "po" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
                <h3 className="text-[15px] font-semibold text-[#111827] mb-5">
                  Numbering
                </h3>
                <div className="flex flex-col gap-4">
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
                    checked={isPOReferenceIDInternal}
                    onChange={setIsPOReferenceIDInternal}
                  />
                </div>
              </div>

              <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
                <h3 className="text-[15px] font-semibold text-[#111827] mb-5">
                  Lists
                </h3>
                <div className="flex flex-col gap-6">
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
            </div>
          )}

          {/* ── Sales Order ── */}
          {activeTab === "so" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
                <h3 className="text-[15px] font-semibold text-[#111827] mb-5">
                  Numbering
                </h3>
                <div className="flex flex-col gap-4">
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
                    checked={isSOReferenceIDInternal}
                    onChange={setIsSOReferenceIDInternal}
                  />
                </div>
              </div>

              <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
                <h3 className="text-[15px] font-semibold text-[#111827] mb-5">
                  Lists
                </h3>
                <div className="flex flex-col gap-6">
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
            </div>
          )}

          {/* ── Product ── */}
          {activeTab === "product" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
                <h3 className="text-[15px] font-semibold text-[#111827] mb-5">
                  Product Code
                </h3>
                <div className="flex flex-col gap-4">
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
              </div>

              <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
                <h3 className="text-[15px] font-semibold text-[#111827] mb-5">
                  Tax
                </h3>
                <GstListInput
                  items={applicableGst}
                  onChange={setApplicableGst}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
