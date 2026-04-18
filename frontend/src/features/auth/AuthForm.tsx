"use client";

import { FormEvent, useState } from "react";

type Props = {
  mode: "login" | "register";
  onSubmit: (payload: { name?: string; email: string; password: string }) => Promise<void>;
};

export default function AuthForm({ mode, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ name, email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-6 shadow-[0_10px_24px_rgba(77,57,26,0.1)]">
      {mode === "register" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Name"
          className="input"
        />
      )}
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        type="email"
        placeholder="Email"
        className="input"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        minLength={8}
        placeholder="Password"
        className="input"
      />
      <button
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
      </button>
    </form>
  );
}
