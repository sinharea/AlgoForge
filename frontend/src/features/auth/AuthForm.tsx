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
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      {mode === "register" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Name"
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
        />
      )}
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        type="email"
        placeholder="Email"
        className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        type="password"
        minLength={8}
        placeholder="Password"
        className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
      />
      <button
        disabled={loading}
        className="w-full rounded bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500 disabled:opacity-60"
      >
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
      </button>
    </form>
  );
}
