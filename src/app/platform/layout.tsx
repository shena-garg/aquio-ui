import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aquio Platform Admin",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
