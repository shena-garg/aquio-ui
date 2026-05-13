"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PlatformRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("platformAccessToken");
    if (!token) {
      router.replace("/platform/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
