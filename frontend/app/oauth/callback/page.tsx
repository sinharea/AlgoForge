"use client";

import { useEffect, useMemo } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { setAuthTokens } from "@/src/utils/auth";

type OAuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

const getParam = (params: URLSearchParams, key: string) => params.get(key) || "";

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<OAuthCallbackLoading />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const payload = useMemo(() => {
    const accessToken = getParam(searchParams, "accessToken");
    const refreshToken = getParam(searchParams, "refreshToken");
    const error = getParam(searchParams, "error");

    const user: OAuthUser = {
      id: getParam(searchParams, "id"),
      name: getParam(searchParams, "name"),
      email: getParam(searchParams, "email"),
      role: getParam(searchParams, "role") || "user",
      avatarUrl: getParam(searchParams, "avatarUrl"),
    };

    return { accessToken, refreshToken, error, user };
  }, [searchParams]);

  useEffect(() => {
    if (payload.error) {
      toast.error(payload.error);
      const timer = setTimeout(() => router.replace("/auth/login"), 1200);
      return () => clearTimeout(timer);
    }

    if (!payload.accessToken || !payload.refreshToken || !payload.user.email) {
      toast.error("Invalid OAuth callback payload");
      const timer = setTimeout(() => router.replace("/auth/login"), 1200);
      return () => clearTimeout(timer);
    }

    setAuthTokens(payload.accessToken, payload.refreshToken, payload.user);
    toast.success("Signed in successfully");
    const timer = setTimeout(() => router.replace("/problems"), 400);
    return () => clearTimeout(timer);
  }, [payload, router]);

  if (payload.error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="card w-full max-w-md text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[var(--error)]" />
          <h1 className="text-xl font-semibold">OAuth Failed</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{payload.error}</p>
        </div>
      </div>
    );
  }

  return <OAuthCallbackLoading />;
}

function OAuthCallbackLoading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="card w-full max-w-md text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
        <h1 className="text-xl font-semibold">Completing Sign In</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Please wait while we sign you in.</p>
        <div className="mt-4 flex items-center justify-center text-[var(--text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    </div>
  );
}
