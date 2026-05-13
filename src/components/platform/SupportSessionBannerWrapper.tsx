"use client";

import { useAuth } from "@/contexts/AuthContext";
import { SupportSessionBanner } from "./SupportSessionBanner";

export function SupportSessionBannerWrapper() {
  const { user } = useAuth();
  if (!user?.isOrgSupport) return null;
  return <SupportSessionBanner />;
}
