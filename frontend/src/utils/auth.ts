"use client";

type User = { id: string; name: string; email: string; role: string };

const ACCESS = "af_access_token";
const REFRESH = "af_refresh_token";
const USER = "af_user";

export const setAuthTokens = (access: string, refresh: string, user: User) => {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
  localStorage.setItem(USER, JSON.stringify(user));
};

export const getAccessToken = () => localStorage.getItem(ACCESS);
export const getRefreshToken = () => localStorage.getItem(REFRESH);
export const getUser = (): User | null => {
  const raw = localStorage.getItem(USER);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = () => {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
};
