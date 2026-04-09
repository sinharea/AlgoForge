"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi } from "@/src/api/adminApi";

export default function UserManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () =>
      (
        await adminApi.getUsers({
          page: 1,
          limit: 100,
          ...(search.trim() ? { search: search.trim() } : {}),
        })
      ).data,
  });

  const banMutation = useMutation({
    mutationFn: async (userId: string) => adminApi.banUser(userId),
    onSuccess: () => {
      toast.success("User banned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to ban user";
      toast.error(message);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => adminApi.unbanUser(userId),
    onSuccess: () => {
      toast.success("User unbanned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to unban user";
      toast.error(message);
    },
  });

  const users = usersQuery.data?.items || [];

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">User Management</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="input max-w-xs"
          placeholder="Search by name/email"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-secondary)]">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-t border-[var(--border-color)]">
                <td className="px-3 py-2">{user.name}</td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">{user.role}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      user.status === "banned" ? "text-rose-300" : "text-emerald-300"
                    }
                  >
                    {user.status || "active"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {user.status === "banned" ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => unbanMutation.mutate(user._id)}
                      disabled={unbanMutation.isPending}
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      style={{ background: "rgba(239,68,68,.15)", color: "#fca5a5" }}
                      onClick={() => banMutation.mutate(user._id)}
                      disabled={banMutation.isPending}
                    >
                      Ban
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {users.length === 0 && !usersQuery.isLoading && (
              <tr>
                <td className="px-3 py-4 text-[var(--text-secondary)]" colSpan={5}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
