"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi } from "@/src/api/adminApi";

export default function ReportsPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");

  const reportsQuery = useQuery({
    queryKey: ["admin-reports", statusFilter],
    queryFn: async () =>
      (
        await adminApi.getReports({
          page: 1,
          limit: 100,
          ...(statusFilter ? { status: statusFilter } : {}),
        })
      ).data,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: "delete" | "ignore" }) =>
      adminApi.reportAction(reportId, action),
    onSuccess: (_, variables) => {
      toast.success(variables.action === "delete" ? "Target deleted" : "Report ignored");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-reports"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to process report";
      toast.error(message);
    },
  });

  const reports = reportsQuery.data?.items || [];

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Reports Moderation</h2>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="input select max-w-[220px]"
        >
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--text-secondary)]">
              <th className="px-3 py-2">Reported By</th>
              <th className="px-3 py-2">Target Type</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id} className="border-t border-[var(--border-color)]">
                <td className="px-3 py-2">
                  {report.userId?.name || "Unknown"}
                  <div className="text-xs text-[var(--text-secondary)]">{report.userId?.email || "-"}</div>
                </td>
                <td className="px-3 py-2">{report.targetType || "other"}</td>
                <td className="px-3 py-2">{report.reason}</td>
                <td className="px-3 py-2">{report.status}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn"
                      style={{ background: "rgba(239,68,68,.15)", color: "#fca5a5" }}
                      onClick={() => actionMutation.mutate({ reportId: report._id, action: "delete" })}
                      disabled={actionMutation.isPending || report.status === "resolved"}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => actionMutation.mutate({ reportId: report._id, action: "ignore" })}
                      disabled={actionMutation.isPending || report.status === "resolved"}
                    >
                      Ignore
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {reports.length === 0 && !reportsQuery.isLoading && (
              <tr>
                <td className="px-3 py-4 text-[var(--text-secondary)]" colSpan={5}>
                  No reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
