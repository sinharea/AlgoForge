"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AuthForm from "@/src/features/auth/AuthForm";
import { authApi } from "@/src/api/authApi";
import { setAuthTokens } from "@/src/utils/auth";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <AuthForm
        mode="register"
        onSubmit={async ({ name, email, password }) => {
          try {
            const { data } = await authApi.register({ name: name || "", email, password });
            setAuthTokens(data.accessToken, data.refreshToken, data.user);
            toast.success("Account created");
            router.push("/problems");
          } catch (error: any) {
            toast.error(error?.response?.data?.message || "Registration failed");
          }
        }}
      />
    </div>
  );
}
