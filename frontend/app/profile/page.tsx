"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
import { authApi } from "@/src/api/authApi";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { useAuthContext } from "@/src/context/AuthContext";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

export default function ProfilePage() {
  useProtectedRoute();
  const { user, updateUser } = useAuthContext();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await authApi.me()).data.user as ProfileUser,
  });

  useEffect(() => {
    const profile = profileQuery.data || user;
    if (!profile) return;
    setName(profile.name || "");
    setAvatarUrl(profile.avatarUrl || "");
  }, [profileQuery.data, user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: { name?: string; avatarUrl?: string } = {};
      if (name.trim()) payload.name = name.trim();
      payload.avatarUrl = avatarUrl.trim();
      return (await authApi.updateMe(payload)).data.user as ProfileUser;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success("Profile updated");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error?.issues?.[0]?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Unable to update profile";
      toast.error(message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateMutation.mutate();
  };

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Update your display name and profile image.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-16 w-16 rounded-full border border-[var(--border-color)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xl font-semibold text-white">
              {(name || user?.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{profileQuery.data?.email || user?.email}</p>
            <p className="text-xs text-[var(--text-muted)]">{profileQuery.data?.role || user?.role}</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            maxLength={80}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Profile image URL</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="input"
            placeholder="https://example.com/avatar.jpg"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Use a direct http(s) image link.</p>
        </div>

        <button type="submit" disabled={updateMutation.isPending} className="btn btn-primary">
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
