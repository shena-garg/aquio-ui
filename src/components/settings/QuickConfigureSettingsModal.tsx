"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  organizationSettingsService,
  OrganizationSettings,
} from "@/services/organization-settings";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    <div className="mt-3 rounded-lg bg-[#f9fafb] p-4">
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
        Enter percentages without the % sign (e.g. 18)
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
          className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function QuickConfigureSettingsModal({ open, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keep a reference to full settings so untouched fields aren't lost on save
  const [fullSettings, setFullSettings] = useState<OrganizationSettings | null>(null);

  // PO
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [generatePOAutomatically, setGeneratePOAutomatically] = useState(false);
  const [poPrefix, setPoPrefix] = useState("PO");
  const [poSeparator, setPoSeparator] = useState("-");
  const [nextPONumber, setNextPONumber] = useState(1);

  // SO
  const [soPaymentTerms, setSoPaymentTerms] = useState<string[]>([]);
  const [generateSOAutomatically, setGenerateSOAutomatically] = useState(false);
  const [soPrefix, setSoPrefix] = useState("SO");
  const [soSeparator, setSoSeparator] = useState("-");
  const [nextSONumber, setNextSONumber] = useState(1);

  // Product
  const [applicableGst, setApplicableGst] = useState<number[]>([]);
  const [generateSKUAutomatically, setGenerateSKUAutomatically] = useState(false);
  const [skuPrefix, setSkuPrefix] = useState("SKU");
  const [skuSeparator, setSkuSeparator] = useState("-");
  const [nextSKUNumber, setNextSKUNumber] = useState(1);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    organizationSettingsService
      .getMyOwn()
      .then((r) => {
        const s = r.data;
        setFullSettings(s);
        setPaymentTerms(s.paymentTerms ?? []);
        setGeneratePOAutomatically(s.generatePOAutomatically ?? false);
        setPoPrefix(s.poPrefix ?? "PO");
        setPoSeparator(s.poSeparator ?? "-");
        setNextPONumber(s.nextPONumber ?? 1);
        setSoPaymentTerms(s.soPaymentTerms ?? []);
        setGenerateSOAutomatically(s.generateSOAutomatically ?? false);
        setSoPrefix(s.soPrefix ?? "SO");
        setSoSeparator(s.soSeparator ?? "-");
        setNextSONumber(s.nextSONumber ?? 1);
        setApplicableGst(s.applicableGst ?? []);
        setGenerateSKUAutomatically(s.generateSKUAutomatically ?? false);
        setSkuPrefix(s.skuPrefix ?? "SKU");
        setSkuSeparator(s.skuSeparator ?? "-");
        setNextSKUNumber(s.nextSKUNumber ?? 1);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setIsLoading(false));
  }, [open]);

  function handleClose() {
    if (!isSaving) onClose();
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await organizationSettingsService.update({
        // Fields shown in this modal
        paymentTerms,
        generatePOAutomatically,
        poPrefix,
        poSeparator,
        nextPONumber,
        soPaymentTerms,
        generateSOAutomatically,
        soPrefix,
        soSeparator,
        nextSONumber,
        applicableGst,
        generateSKUAutomatically,
        skuPrefix,
        skuSeparator,
        nextSKUNumber,
        // Preserve fields not shown here
        poCancelReasons: fullSettings?.poCancelReasons,
        soCancelReasons: fullSettings?.soCancelReasons,
        isPOReferenceIDInternal: fullSettings?.isPOReferenceIDInternal,
        isSOReferenceIDInternal: fullSettings?.isSOReferenceIDInternal,
      });
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["organization-settings"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      onSaved();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save settings";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-[580px] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0fdfa]">
              <Settings className="h-4 w-4 text-[#0d9488]" />
            </div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Configure Order Settings
            </DialogTitle>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-5 w-5 animate-spin text-[#0d9488]" />
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-y-auto px-5 py-5 space-y-6">
            {/* Purchase Orders */}
            <div>
              <SectionHeader
                title="Purchase Orders"
                description="Payment terms and auto-numbering used when creating purchase orders"
              />
              <div className="space-y-4">
                <TagListInput
                  label="Payment Terms"
                  description="Options shown in the payment terms dropdown"
                  items={paymentTerms}
                  onChange={setPaymentTerms}
                  placeholder="e.g. Net 30"
                />
                <Toggle
                  label="Auto-generate PO Number"
                  description="Assign a sequential number when a new PO is created"
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
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Sales Orders */}
            <div>
              <SectionHeader
                title="Sales Orders"
                description="Payment terms and auto-numbering used when creating sales orders"
              />
              <div className="space-y-4">
                <TagListInput
                  label="Payment Terms"
                  description="Options shown in the payment terms dropdown"
                  items={soPaymentTerms}
                  onChange={setSoPaymentTerms}
                  placeholder="e.g. 90 Days"
                />
                <Toggle
                  label="Auto-generate SO Number"
                  description="Assign a sequential number when a new SO is created"
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
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Products */}
            <div>
              <SectionHeader
                title="Products"
                description="GST rates and SKU auto-numbering for your product catalog"
              />
              <div className="space-y-4">
                <GstListInput items={applicableGst} onChange={setApplicableGst} />
                <Toggle
                  label="Auto-generate Product Code (SKU)"
                  description="Assign a sequential code when a new product is created"
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
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="border-gray-200 text-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          >
            {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
