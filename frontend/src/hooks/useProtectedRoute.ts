"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "./useAuth";

export default function useProtectedRoute(roles?: string[]) {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (roles?.length && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [ready, user, roles, router]);

  return { user, ready };
}
