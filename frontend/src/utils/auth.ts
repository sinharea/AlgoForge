"use client";

export type User = { id: string; _id?: string; name: string; email: string; role: string; avatarUrl?: string };

const ACCESS = "af_access_token";
const REFRESH = "af_refresh_token";
const USER = "af_user";

const canUseStorage = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

export const setAuthTokens = (access: string, refresh: string, user: User) => {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
  localStorage.setItem(USER, JSON.stringify(user));
};

export const getAccessToken = () => (canUseStorage() ? localStorage.getItem(ACCESS) : null);
export const getRefreshToken = () => (canUseStorage() ? localStorage.getItem(REFRESH) : null);
export const getUser = (): User | null => {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAuth = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
};
