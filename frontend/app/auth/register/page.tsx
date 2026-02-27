"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    console.log("Register clicked"); // Debug check

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          email,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      console.log("User registered:", data);

      router.push("/auth/login");

    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b1220] text-white">
      <div className="w-full max-w-md p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl space-y-6">

        <h1 className="text-3xl font-bold text-center">Join AlgoForge</h1>

        <form onSubmit={handleRegister} className="space-y-5">

          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/10"
          />

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/10"
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/10"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl"
          >
            Create Account
          </button>
        </form>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-purple-400">
            Login
          </Link>
        </p>

      </div>
    </main>
  );
}