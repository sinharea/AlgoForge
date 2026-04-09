"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi } from "@/src/api/adminApi";

type ContestItem = {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  problems: Array<{ _id: string; title: string }> | string[];
};

type ProblemItem = {
  _id: string;
  questionNumber?: number;
  title: string;
};

const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toIsoString = (value: string) => new Date(value).toISOString();

const initialForm = {
  name: "",
  description: "",
  startTime: "",
  endTime: "",
  problemIds: [] as string[],
};

export default function ContestManager() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialForm);
  const [editingContestId, setEditingContestId] = useState<string | null>(null);

  const contestsQuery = useQuery({
    queryKey: ["admin-contest-list"],
    queryFn: async () => (await adminApi.listContests()).data,
  });

  const problemsQuery = useQuery({
    queryKey: ["admin-contest-problem-options"],
    queryFn: async () => (await adminApi.listProblems({ page: 1, limit: 200 })).data,
  });

  const contests: ContestItem[] = useMemo(
    () => (contestsQuery.data || []) as ContestItem[],
    [contestsQuery.data]
  );

  const problems: ProblemItem[] = useMemo(
    () => ((problemsQuery.data?.items || []) as ProblemItem[]),
    [problemsQuery.data]
  );

  const createContestMutation = useMutation({
    mutationFn: async () => {
      return adminApi.createContest({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startTime: toIsoString(form.startTime),
        endTime: toIsoString(form.endTime),
        problemIds: form.problemIds,
      });
    },
    onSuccess: () => {
      toast.success("Contest created");
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["admin-contest-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to create contest";
      toast.error(message);
    },
  });

  const updateContestMutation = useMutation({
    mutationFn: async () => {
      if (!editingContestId) return;
      return adminApi.updateContest(editingContestId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startTime: toIsoString(form.startTime),
        endTime: toIsoString(form.endTime),
        problemIds: form.problemIds,
      });
    },
    onSuccess: () => {
      toast.success("Contest updated");
      setEditingContestId(null);
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["admin-contest-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to update contest";
      toast.error(message);
    },
  });

  const deleteContestMutation = useMutation({
    mutationFn: async (contestId: string) => adminApi.deleteContest(contestId),
    onSuccess: () => {
      toast.success("Contest deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-contest-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to delete contest";
      toast.error(message);
    },
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.startTime || !form.endTime || form.problemIds.length === 0) {
      toast.error("Name, timing and at least one problem are required");
      return;
    }

    if (new Date(form.endTime) <= new Date(form.startTime)) {
      toast.error("End time must be after start time");
      return;
    }

    if (editingContestId) {
      await updateContestMutation.mutateAsync();
      return;
    }

    await createContestMutation.mutateAsync();
  };

  const handleDeleteContest = async (contestId: string) => {
    const proceed = window.confirm("Delete this contest?");
    if (!proceed) return;
    await deleteContestMutation.mutateAsync(contestId);
  };

  const startEdit = (contest: ContestItem) => {
    const problemIds = (contest.problems || []).map((item) =>
      typeof item === "string" ? item : item._id
    );

    setEditingContestId(contest._id);
    setForm({
      name: contest.title || "",
      description: contest.description || "",
      startTime: toLocalDateTime(contest.startTime),
      endTime: toLocalDateTime(contest.endTime),
      problemIds,
    });
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contest Manager</h2>
          {editingContestId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingContestId(null);
                setForm(initialForm);
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          className="input"
          placeholder="Contest name"
        />

        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          className="input min-h-[100px]"
          placeholder="Description"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="datetime-local"
            value={form.startTime}
            onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
            className="input"
          />
          <input
            type="datetime-local"
            value={form.endTime}
            onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
            className="input"
          />
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="mb-2 text-sm font-medium">Select problems</p>
          <div className="max-h-52 space-y-2 overflow-auto pr-2">
            {problems.map((problem) => {
              const checked = form.problemIds.includes(problem._id);
              return (
                <label key={problem._id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...form.problemIds, problem._id]
                        : form.problemIds.filter((id) => id !== problem._id);
                      setForm((prev) => ({ ...prev, problemIds: next }));
                    }}
                  />
                  {problem.questionNumber || "-"}. {problem.title}
                </label>
              );
            })}

            {problems.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No problems available.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={createContestMutation.isPending || updateContestMutation.isPending}
          >
            {editingContestId
              ? updateContestMutation.isPending
                ? "Saving..."
                : "Edit"
              : createContestMutation.isPending
                ? "Creating..."
                : "Create"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Existing Contests</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2">Problems</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => (
                <tr key={contest._id} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-2">{contest.title}</td>
                  <td className="px-3 py-2">{new Date(contest.startTime).toLocaleString()}</td>
                  <td className="px-3 py-2">{new Date(contest.endTime).toLocaleString()}</td>
                  <td className="px-3 py-2">{contest.problems?.length || 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => startEdit(contest)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ background: "rgba(239,68,68,.15)", color: "#fca5a5" }}
                        onClick={() => handleDeleteContest(contest._id)}
                        disabled={deleteContestMutation.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {contests.length === 0 && !contestsQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-[var(--text-secondary)]">
                    No contests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
