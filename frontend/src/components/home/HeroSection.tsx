"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, Zap, Shield, ArrowRight } from "lucide-react";
import CountUp from "react-countup";

const features = [
  {
    icon: Code2,
    title: "Focused Editor",
    description: "Write and test solutions quickly.",
  },
  {
    icon: Zap,
    title: "Fast Feedback",
    description: "Run code and get results in seconds.",
  },
  {
    icon: Shield,
    title: "Safe Sandbox",
    description: "Secure execution with strict limits.",
  },
];

const stats = [
  { value: 500, label: "Problems", suffix: "+" },
  { value: 10, label: "Languages", suffix: "+" },
  { value: 99.9, label: "Uptime", suffix: "%" },
];

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-amber-700/20 blur-[120px]" />
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
              <span className="text-[var(--text-secondary)]">Classic coding practice, modern workflow</span>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Practice better with <span className="gradient-text">AlgoForge</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-secondary)]">
              Solve quality problems, improve daily, and track real progress.
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
            className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {stats.map((stat, idx) => (
              <div key={idx} className="card text-center">
                <div className="text-2xl font-bold text-[var(--accent-secondary)]">
                  <CountUp end={stat.value} duration={2} decimals={stat.value % 1 ? 1 : 0} />
                  {stat.suffix}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/70 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold">Simple and practical</h2>
              <p className="mt-3 text-[var(--text-secondary)]">
                Built for consistent problem-solving practice.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  className="card card-hover"
                >
                  <div className="mb-4 inline-flex rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3">
                    <feature.icon className="h-6 w-6 text-[var(--accent-secondary)]" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
