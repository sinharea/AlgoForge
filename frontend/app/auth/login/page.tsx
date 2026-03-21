"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AuthForm from "@/src/features/auth/AuthForm";
import { authApi } from "@/src/api/authApi";
import { setAuthTokens } from "@/src/utils/auth";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <AuthForm
        mode="login"
        onSubmit={async ({ email, password }) => {
          try {
            const { data } = await authApi.login({ email, password });
            setAuthTokens(data.accessToken, data.refreshToken, data.user);
            toast.success("Logged in");
            router.push("/problems");
          } catch (error: any) {
            toast.error(error?.response?.data?.message || "Login failed");
          }
        }}
      />
    </div>
  );
}
