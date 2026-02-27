"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Store JWT + user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to homepage
      router.push("/");

    } catch (err) {
      setError("Something went wrong. Try again.");
    }

    setLoading(false);
  };

  return (
    <main className="relative min-h-screen bg-[#0b1220] text-white overflow-hidden flex items-center justify-center">

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#11183a] to-[#0b1220] animate-gradient"></div>
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-purple-600/20 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-blue-600/20 blur-[150px] rounded-full"></div>

      <div className="relative w-full max-w-md p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl space-y-8 animate-fadeUp">

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm">
            Login to continue your journey.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>

          <input
            type="email"
            required
            placeholder="Email"
            className="w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            required
            placeholder="Password"
            className="w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 outline-none transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-[1.02] transition transform shadow-lg shadow-purple-600/30 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <div className="text-center text-gray-400 text-sm">
          Don’t have an account?{" "}
          <Link
            href="/auth/register"
            className="text-purple-400 hover:text-purple-300 transition"
          >
            Sign Up
          </Link>
        </div>

      </div>
    </main>
  );
}