"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { UsersTable } from "@/components/users/UsersTable";
import { usersService } from "@/services/users";
import { rolesService } from "@/services/roles";

// ── Search field config ──────────────────────────────────────────────────────

type SearchFieldKey = "name" | "email" | "phoneNumber";

const SEARCH_FIELDS: { key: SearchFieldKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email Address" },
  { key: "phoneNumber", label: "Mobile Number" },
];

const SELECT_INPUT_CLASS =
  "h-8 cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]";

// ── Page component ───────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [searchField, setSearchField] = useState<SearchFieldKey>("name");
  const [searchValue, setSearchValue] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // ── Roles query (cached for 10 minutes) ──────────────────────────────────

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesService.list().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  // ── Users query ──────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["users", page, limit, activeTab, searchField, searchValue],
    queryFn: () =>
      usersService
        .list({
          page,
          limit,
          status: activeTab,
          ...(searchValue ? { [searchField]: searchValue } : {}),
        } as Parameters<typeof usersService.list>[0])
        .then((res) => res.data),
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load users. Please try again.");
    }
  }, [isError]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleTabChange(tab: "active" | "inactive") {
    setActiveTab(tab);
    setPage(1);
  }

  function handleLimitChange(newLimit: number) {
    setLimit(newLimit);
    setPage(1);
  }

  function handleSearch() {
    if (!searchValue.trim()) return;
    setPage(1);
  }

  function handleReset() {
    setSearchField("name");
    setSearchValue("");
    setPage(1);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  const actions = (
    <Button
      size="icon"
      onClick={() => router.push("/users/create")}
      className="h-9 w-9 min-h-[44px] min-w-[44px] sm:h-8 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:gap-1.5 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white"
    >
      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      <span className="hidden sm:inline">Add User</span>
    </Button>
  );

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const TABS: { label: string; value: "active" | "inactive" }[] = [
    { label: "Active", value: "active" },
    { label: "Deactivated", value: "inactive" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Users"
        total={data?.totalCount ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        actions={actions}
      />

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-4 sm:px-6">
        {TABS.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#0d9488]"
                  : "border-transparent text-gray-500 hover:text-[#0F1720]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search bar – desktop */}
      <div className="hidden lg:block bg-white">
        <div className="flex flex-wrap items-center gap-2 px-6 py-3">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchFieldKey)}
            className={SELECT_INPUT_CLASS}
          >
            {SEARCH_FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>

          <Input
            type="text"
            placeholder={`Search by ${SEARCH_FIELDS.find((f) => f.key === searchField)!.label}…`}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 w-56 border-gray-200 text-[13px] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-[#0d9488]/20"
          />

          <Button
            onClick={handleSearch}
            disabled={!searchValue.trim()}
            size="sm"
            className="h-8 px-4 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white disabled:opacity-50"
          >
            Search
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="h-8 border-gray-200 px-4 text-[13px] text-gray-600 hover:text-[#0F1720]"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Search – mobile: filter button + active chip */}
      <div className="lg:hidden bg-white">
        {!mobileFilterOpen && (
          <div className="flex items-center gap-2 px-4 py-2.5">
            {searchValue.trim() && (
              <div className="flex items-center gap-1 bg-[#f0fdfa] border border-[#0d9488]/20 rounded-full px-2.5 py-1">
                <span className="text-[11px] text-[#0d9488] font-medium">
                  {SEARCH_FIELDS.find((f) => f.key === searchField)!.label}: {searchValue}
                </span>
                <button
                  onClick={handleReset}
                  className="text-[#0d9488] hover:text-[#0f766e]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileFilterOpen(true)}
              className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-md border border-gray-200 text-[13px] font-medium text-gray-600 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>
        )}

        {mobileFilterOpen && (
          <div className="px-4 py-3 space-y-2">
            <span className="text-[11px] text-gray-400">Filter by</span>
            <div className="flex items-center gap-2">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchFieldKey)}
                className="h-9 w-[130px] flex-shrink-0 cursor-pointer rounded-md border border-gray-200 bg-white px-2 text-[13px] text-[#0F1720] outline-none focus:border-[#0d9488]"
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              <Input
                type="text"
                placeholder={`${SEARCH_FIELDS.find((f) => f.key === searchField)!.label}…`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                    setMobileFilterOpen(false);
                  }
                }}
                className="h-9 flex-1 border-gray-200 text-[13px] shadow-none focus-visible:border-[#0d9488] focus-visible:ring-[#0d9488]/20"
              />
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Close
              </button>
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => {
                    handleReset();
                    setMobileFilterOpen(false);
                  }}
                  className="text-[13px] text-gray-400 hover:text-red-500 transition-colors"
                >
                  Reset
                </button>
                <Button
                  onClick={() => {
                    handleSearch();
                    setMobileFilterOpen(false);
                  }}
                  disabled={!searchValue.trim()}
                  size="sm"
                  className="h-9 px-6 text-[13px] !bg-[#0d9488] hover:!bg-[#0f766e] text-white disabled:opacity-50"
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <UsersTable
          users={data?.users ?? []}
          roles={roles ?? []}
          isLoading={isLoading}
          activeTab={activeTab}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
