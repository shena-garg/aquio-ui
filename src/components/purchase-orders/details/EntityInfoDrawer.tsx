"use client";

import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { OrderEntity } from "@/services/purchase-orders";

interface EntityInfoDrawerProps {
  entity: OrderEntity | null;
  label: string;
  onClose: () => void;
}

export function EntityInfoDrawer({ entity, label, onClose }: EntityInfoDrawerProps) {
  if (!entity) return null;

  const addr = entity.address;
  const addressLines = [
    addr?.addressLine1,
    addr?.addressLine2,
    [addr?.city, addr?.state].filter(Boolean).join(", "),
    [addr?.postalCode, addr?.country].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">{label} Details</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.8px] text-gray-500 uppercase mb-0.5">Name</div>
            <div className="text-sm text-gray-900">{entity.name}</div>
          </div>

          {entity.taxNumber && (
            <div>
              <div className="text-[10px] font-semibold tracking-[0.8px] text-gray-500 uppercase mb-0.5">Tax Number</div>
              <div className="text-sm text-gray-900">{entity.taxNumber}</div>
            </div>
          )}

          {entity.contactNumber && (
            <div>
              <div className="text-[10px] font-semibold tracking-[0.8px] text-gray-500 uppercase mb-0.5">Contact</div>
              <div className="text-sm text-gray-900">{entity.contactNumber}</div>
            </div>
          )}

          {addressLines.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-[0.8px] text-gray-500 uppercase mb-0.5">Address</div>
              <div className="text-sm text-gray-900 leading-relaxed">
                {addressLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {addr?.gstNumber && (
            <div>
              <div className="text-[10px] font-semibold tracking-[0.8px] text-gray-500 uppercase mb-0.5">GST Number</div>
              <div className="text-sm text-gray-900">{addr.gstNumber}</div>
            </div>
          )}
        </div>

        {entity.id && (
          <div className="border-t border-gray-200 px-4 py-3">
            <Link
              href={`/partners/${entity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              View Partner Page
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
