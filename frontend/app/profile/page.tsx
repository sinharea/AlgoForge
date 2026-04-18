"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader2, Save, Upload } from "lucide-react";
import { authApi } from "@/src/api/authApi";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { useAuthContext } from "@/src/context/AuthContext";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  socialLinks?: { github?: string; linkedin?: string; website?: string };
  preferredLanguage?: string;
};

export default function ProfilePage() {
  useProtectedRoute();
  const { user, updateUser } = useAuthContext();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("cpp");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await authApi.me()).data.user as ProfileUser,
  });

  useEffect(() => {
    const profile = profileQuery.data || user;
    if (!profile) return;
    setName(profile.name || "");
    setAvatarUrl(profile.avatarUrl || "");
    setBio((profile as ProfileUser).bio || "");
    setGithub((profile as ProfileUser).socialLinks?.github || "");
    setLinkedin((profile as ProfileUser).socialLinks?.linkedin || "");
    setWebsite((profile as ProfileUser).socialLinks?.website || "");
    setPreferredLanguage((profile as ProfileUser).preferredLanguage || "cpp");
  }, [profileQuery.data, user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(avatarUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, avatarUrl]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append("name", name.trim());
      payload.append("bio", bio.trim());
      payload.append("preferredLanguage", preferredLanguage);
      payload.append("socialLinks", JSON.stringify({ github: github.trim(), linkedin: linkedin.trim(), website: website.trim() }));
      if (avatarFile) {
        payload.append("avatar", avatarFile);
      }
      if (currentPassword && newPassword) {
        payload.append("currentPassword", currentPassword);
        payload.append("newPassword", newPassword);
      }
      return (await authApi.updateMe(payload)).data.user as ProfileUser;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setAvatarFile(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAvatarUrl(updatedUser.avatarUrl || "");
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

    if ((currentPassword || newPassword) && (!currentPassword || !newPassword)) {
      toast.error("Enter both current and new password");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New password and confirm password must match");
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
          Update your username, password, and profile image.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          {avatarPreview ? (
            <img
              src={avatarPreview}
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
            placeholder="Your username"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Upload profile image</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)]">
            <Upload className="h-4 w-4" />
            <span>{avatarFile ? avatarFile.name : "Choose image (max 2MB)"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 2 * 1024 * 1024) {
                  toast.error("Image must be 2MB or smaller");
                  return;
                }
                setAvatarFile(file);
              }}
            />
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input min-h-[80px] resize-y"
            maxLength={300}
            placeholder="A short bio about yourself"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">{bio.length}/300</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Preferred Language</label>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="input"
          >
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">GitHub</label>
            <input
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              className="input"
              placeholder="https://github.com/username"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">LinkedIn</label>
            <input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              className="input"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="input"
              placeholder="https://yoursite.com"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Re-enter new password"
          />
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
