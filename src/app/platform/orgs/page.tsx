"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2, ExternalLink, Search } from "lucide-react";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { platformService, OrgRow } from "@/services/platform";
import { authService } from "@/services/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function OrgsContent() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loadingOrgId, setLoadingOrgId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "orgs"],
    queryFn: async () => {
      const res = await platformService.listOrgs();
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });

  const orgs = (data ?? []).filter(
    (o) =>
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.primaryAdminEmail ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function handleLoginAsSupport(org: OrgRow) {
    setLoadingOrgId(org._id);
    try {
      const { data: tokenData } = await platformService.generateSupportToken(org._id);
      const { data: sessionData } = await platformService.useSupportToken(tokenData.token);

      // Stash platform tokens before switching
      const platformToken = localStorage.getItem("platformAccessToken");
      const platformRefresh = localStorage.getItem("platformRefreshToken");
      const platformAdmin = localStorage.getItem("platformAdmin");
      if (platformToken) localStorage.setItem("platformAccessToken_stash", platformToken);
      if (platformRefresh) localStorage.setItem("platformRefreshToken_stash", platformRefresh);
      if (platformAdmin) localStorage.setItem("platformAdmin_stash", platformAdmin);

      // Set B2B session as the support user
      localStorage.setItem("accessToken", sessionData.accessToken);
      localStorage.setItem("refreshToken", sessionData.refreshToken);

      const userRes = await authService.me();
      localStorage.setItem("user", JSON.stringify(userRes.data));

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to start support session");
    } finally {
      setLoadingOrgId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-500 text-sm">
        Failed to load organisations. Please refresh.
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="mb-5 relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or admin email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Organisation
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Admin Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Users
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Joined
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Support
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  No organisations found.
                </td>
              </tr>
            )}
            {orgs.map((org) => (
              <tr key={org._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5 font-medium text-gray-900">{org.name}</td>
                <td className="px-4 py-3.5 text-gray-500">{org.primaryAdminEmail ?? "—"}</td>
                <td className="px-4 py-3.5 text-gray-700">{org.userCount}</td>
                <td className="px-4 py-3.5 text-gray-500">{formatDate(org.createdAt)}</td>
                <td className="px-4 py-3.5">
                  {org.supportUserExists ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        org.supportUserActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {org.supportUserActive ? "Active" : "Inactive"}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => handleLoginAsSupport(org)}
                    disabled={loadingOrgId === org._id || !org.supportUserExists || !org.supportUserActive}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingOrgId === org._id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ExternalLink size={13} />
                    )}
                    Login as Support
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {orgs.length} organisation{orgs.length !== 1 ? "s" : ""}
      </p>
    </>
  );
}

export default function PlatformOrgsPage() {
  return (
    <PlatformRouteGuard>
      <div className="flex min-h-screen bg-gray-50">
        <PlatformSidebar />
        <main className="ml-[220px] flex-1 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Building2 size={20} className="text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Organisations</h1>
          </div>
          <OrgsContent />
        </main>
      </div>
    </PlatformRouteGuard>
  );
}
