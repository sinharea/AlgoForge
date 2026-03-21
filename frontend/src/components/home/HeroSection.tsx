"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, Zap, Shield, Trophy, ArrowRight, CheckCircle2 } from "lucide-react";
import CountUp from "react-countup";

const features = [
  {
    icon: Code2,
    title: "Rich Code Editor",
    description: "Monaco-powered editor with syntax highlighting, autocomplete, and multiple language support.",
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description: "Get real-time results with our Docker-based secure code execution engine.",
  },
  {
    icon: Shield,
    title: "Secure Execution",
    description: "Sandboxed environment with resource limits ensures safe code execution.",
  },
  {
    icon: Trophy,
    title: "Compete & Learn",
    description: "Join contests, climb leaderboards, and track your progress with detailed analytics.",
  },
];

const stats = [
  { value: 500, label: "Problems", suffix: "+" },
  { value: 10, label: "Languages", suffix: "+" },
  { value: 50, label: "Active Users", suffix: "K+" },
  { value: 99.9, label: "Uptime", suffix: "%" },
];

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[120px]" />
      </div>

      <div className="relative">
        <section className="px-4 py-20 text-center sm:px-6 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-sm">
              <span className="status-dot status-dot-success" />
              <span className="text-[var(--text-secondary)]">Now with AI-powered recommendations</span>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Master algorithms with{" "}
              <span className="gradient-text">industry-grade</span> coding challenges
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-secondary)]">
              Practice coding problems, compete in contests, and level up your skills with our
              secure, Docker-based execution environment and personalized learning path.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/problems"
                className="btn btn-primary group px-8 py-3 text-base"
              >
                Start Solving
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/auth/register"
                className="btn btn-secondary px-8 py-3 text-base"
              >
                Create Account
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-8"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="card text-center">
                <div className="text-3xl font-bold text-[var(--accent-secondary)]">
                  <CountUp end={stat.value} duration={2} decimals={stat.value % 1 ? 1 : 0} />
                  {stat.suffix}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold">Everything you need to succeed</h2>
              <p className="mt-3 text-[var(--text-secondary)]">
                Built for developers who want to improve their problem-solving skills
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  className="card card-hover"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-[var(--accent-primary)]/10 p-3">
                    <feature.icon className="h-6 w-6 text-[var(--accent-secondary)]" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="card overflow-hidden bg-gradient-to-br from-violet-600/20 to-purple-600/20">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="text-2xl font-bold sm:text-3xl">
                    Ready to level up your coding skills?
                  </h2>
                  <p className="mt-3 text-[var(--text-secondary)]">
                    Join thousands of developers who are already improving their
                    problem-solving abilities with AlgoForge.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {["500+ curated problems", "Real-time contests", "Personalized recommendations", "Detailed analytics"].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/auth/register" className="btn btn-primary py-3 text-base">
                    Get Started Free
                  </Link>
                  <p className="text-center text-xs text-[var(--text-muted)]">
                    No credit card required
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
