"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AqiraContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AqiraContext = createContext<AqiraContextValue | null>(null);

export function AqiraProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AqiraContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((o) => !o),
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
