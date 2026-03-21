"use client";

import axios from "axios";
import { getAccessToken, getRefreshToken, setAuthTokens, clearAuth } from "../utils/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry) throw error;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw error;
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/refresh`,
        { refreshToken }
      );
      setAuthTokens(data.accessToken, data.refreshToken, data.user);
      queue.forEach((cb) => cb(data.accessToken));
      queue = [];
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (e) {
      clearAuth();
      queue.forEach((cb) => cb(null));
      queue = [];
      throw e;
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
