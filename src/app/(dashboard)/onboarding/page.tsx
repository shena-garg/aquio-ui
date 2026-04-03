"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Settings,
  LayoutGrid,
  Store,
  Package,
  Loader2,
  Check,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  checkComplete: () => Promise<boolean>;
  href: string;
  cta: string;
}

// ── Steps ────────────────────────────────────────────────────────────────────

const ICON_CLS = "h-5 w-5 text-[#0d9488]";

function buildSteps(): Step[] {
  return [
    {
      id: "company",
      title: "Complete Company Profile",
      description: "Add your tax number and contact details",
      icon: <Building2 className={ICON_CLS} />,
      checkComplete: async () => {
        try {
          const { data } = await apiClient.get("/organizations/my-own");
          return !!(data.taxNumber && data.phoneNumber);
        } catch { return false; }
      },
      href: "/company",
      cta: "Set Up Company",
    },
    {
      id: "location",
      title: "Add Your First Location",
      description: "Where does your business operate?",
      icon: <MapPin className={ICON_CLS} />,
      checkComplete: async () => {
        try {
          const { data } = await apiClient.get("/locations");
          return (data.locations?.length ?? 0) > 0;
        } catch { return false; }
      },
      href: "/locations/create",
      cta: "Add Location",
    },
    {
      id: "settings",
      title: "Configure Order Settings",
      description: "Set payment terms, PO numbering, and GST rates",
      icon: <Settings className={ICON_CLS} />,
      checkComplete: async () => {
        try {
          const { data } = await apiClient.get("/organization-settings/my-own");
          return (data.paymentTerms?.length ?? 0) > 0;
        } catch { return false; }
      },
      href: "/settings",
      cta: "Configure Settings",
    },
    {
      id: "category",
      title: "Create a Product Category",
      description: "Organize your products into categories",
      icon: <LayoutGrid className={ICON_CLS} />,
      checkComplete: async () => {
        try {
          const { data } = await apiClient.get("/categories");
          return (data.categories?.length ?? 0) > 0;
        } catch { return false; }
      },
      href: "/categories",
      cta: "Add Category",
    },
    {
      id: "partner",
      title: "Add Your First Vendor",
      description: "Who do you buy from or sell to?",
      icon: <Store className={ICON_CLS} />,
      checkComplete: async () => {
        try {
          const { data } = await apiClient.get("/vendor-companies?limit=1");
          return (data.vendorCompanies?.length ?? 0) > 0;
        } catch { return false; }
      },
      href: "/partners/new",
      cta: "Add Vendor",
    },
    {
      id: "product",
      title: "Create Your First Product",
      description: "Add a product with variants to your catalog",
      icon: <Package className={ICON_CLS} />,
      checkComplete: async () => {
        try {
          const { data } = await apiClient.get("/products?limit=1");
          return (data.products?.length ?? 0) > 0;
        } catch { return false; }
      },
      href: "/products/new",
      cta: "Add Product",
    },
  ];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [steps] = useState(buildSteps);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAll() {
      const results: Record<string, boolean> = {};
      await Promise.all(
        steps.map(async (step) => {
          results[step.id] = await step.checkComplete();
        })
      );
      setCompleted(results);
      setLoading(false);
    }
    checkAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const totalSteps = steps.length;
  const allDone = completedCount === totalSteps;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  function handleStepClick(step: Step) {
    router.push(step.href);
  }

  function handleSkip() {
    localStorage.setItem("onboarding_skipped", "true");
    router.push("/dashboard");
  }

  function handleFinish() {
    localStorage.setItem("onboarding_completed", "true");
    queryClient.invalidateQueries();
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d9488]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">
          Welcome! Let&apos;s set up your account
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[640px] p-4 sm:p-6">
          {/* Progress */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 sm:px-6 py-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-[#111827]">
                Setup Progress
              </span>
              <span className="text-[13px] font-medium text-[#6b7280]">
                {completedCount} of {totalSteps} complete
              </span>
            </div>
            <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0d9488] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white overflow-hidden">
            {steps.map((step, i) => {
              const isDone = completed[step.id];
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 px-4 sm:px-6 py-4 ${
                    i < steps.length - 1 ? "border-b border-[#f3f4f6]" : ""
                  } ${isDone ? "opacity-60" : ""}`}
                >
                  {/* Icon / Check */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isDone ? "bg-[#059669]/10" : "bg-[#f0fdfa]"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-5 w-5 text-[#059669]" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-medium ${isDone ? "text-[#6b7280] line-through" : "text-[#111827]"}`}>
                      {step.title}
                    </p>
                    <p className="text-[12px] text-[#9ca3af] mt-0.5">
                      {step.description}
                    </p>
                  </div>

                  {/* Action */}
                  {isDone ? (
                    <span className="text-[12px] font-medium text-[#059669] flex-shrink-0">
                      Done
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStepClick(step)}
                      className="flex-shrink-0 h-8 px-3 text-[12px] bg-[#0d9488] hover:bg-[#0f766e] text-white gap-1"
                    >
                      {step.cta}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handleSkip}
              className="text-[13px] text-[#6b7280] hover:text-[#111827] underline"
            >
              Skip for now
            </button>

            {allDone && (
              <Button
                onClick={handleFinish}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white gap-2"
              >
                <Rocket className="h-4 w-4" />
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
