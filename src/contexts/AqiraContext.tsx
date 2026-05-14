"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// ─── form context (price alerts) ─────────────────────────────────────────────

export interface AqiraFormRow {
  productId: string;
  variantId: string | null;
  productName: string;
  enteredPrice: number;
  hasVariants: boolean;
}

export interface AqiraFormContext {
  orderType: "purchase" | "sales";
  partnerId: string | null;
  rows: AqiraFormRow[];
}

// ─── draft ────────────────────────────────────────────────────────────────────

export interface AqiraDraftProduct {
  productId: string | null;
  productName: string;
  variantId: string | null;
  variantName: string;
  quantity: number;
  price: number | null;
  uom: string;
  gst: number;
}

export interface AqiraDraft {
  orderType: "purchase" | "sales";
  supplierId: string | null;
  supplierName: string | null;
  products: AqiraDraftProduct[];
  deliveryDate: string | null;
  paymentTerms: string | null;
  notes: string | null;
}

interface AqiraContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  pendingDraft: AqiraDraft | null;
  setPendingDraft: (draft: AqiraDraft | null) => void;
  formContext: AqiraFormContext | null;
  setFormContext: (ctx: AqiraFormContext | null) => void;
}

const AqiraContext = createContext<AqiraContextValue | null>(null);

export function AqiraProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<AqiraDraft | null>(null);
  const [formContext, setFormContext] = useState<AqiraFormContext | null>(null);

  return (
    <AqiraContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((o) => !o),
        pendingDraft,
        setPendingDraft,
        formContext,
        setFormContext,
      }}
    >
      {children}
    </AqiraContext.Provider>
  );
}

export function useAqira() {
  const ctx = useContext(AqiraContext);
  if (!ctx) throw new Error("useAqira must be used within AqiraProvider");
  return ctx;
}
