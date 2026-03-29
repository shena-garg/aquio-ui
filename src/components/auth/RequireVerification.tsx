"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";

interface RequireVerificationProps {
  children: React.ReactElement<{ disabled?: boolean; title?: string; className?: string }>;
  tooltip?: string;
}

export function RequireVerification({
  children,
  tooltip = "Please verify your email to create orders",
}: RequireVerificationProps) {
  const { user } = useAuth();

  if (!user || user.accountVerified !== false) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {React.cloneElement(children, {
        disabled: true,
        className: `${children.props.className ?? ""} !opacity-50 !cursor-not-allowed`,
      })}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
