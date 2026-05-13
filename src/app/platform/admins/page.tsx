"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, Plus, X } from "lucide-react";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { platformService, PlatformAdmin } from "@/services/platform";
import { toast } from "sonner";

function AddAdminModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => platformService.createAdmin(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "admins"] });
      toast.success("Platform admin created");
      onClose();
    },
    onError: () => {
      setError("Failed to create admin. Email may already exist.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Add Platform Admin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {["name", "email", "password"].map((field) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 capitalize">{field}</label>
              <input
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                required
                minLength={field === "password" ? 8 : 1}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-md flex items-center gap-2 transition-colors"
            >
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminsContent() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "admins"],
    queryFn: async () => {
      const res = await platformService.listAdmins();
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      platformService.setAdminStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "admins"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const admins = data ?? [];

  return (
    <>
      <div className="flex justify-end mb-5">
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={15} />
          Add Admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  No platform admins found.
                </td>
              </tr>
            )}
            {admins.map((admin: PlatformAdmin) => (
              <tr key={admin._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5 font-medium text-gray-900">{admin.name}</td>
                <td className="px-4 py-3.5 text-gray-500">{admin.email}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      admin.status === "active"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {admin.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-500">
                  {new Date(admin.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() =>
                      toggleStatus.mutate({
                        id: admin._id,
                        status: admin.status === "active" ? "inactive" : "active",
                      })
                    }
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {admin.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} />}
    </>
  );
}

export default function PlatformAdminsPage() {
  return (
    <PlatformRouteGuard>
      <div className="flex min-h-screen bg-gray-50">
        <PlatformSidebar />
        <main className="ml-[220px] flex-1 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users size={20} className="text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Platform Admins</h1>
          </div>
          <AdminsContent />
        </main>
      </div>
    </PlatformRouteGuard>
  );
}
