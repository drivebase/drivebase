import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Drivebase vs rclone",
  description:
    "Compare Drivebase and rclone across UX, collaboration, automation, and deployment options.",
};

const comparisonRows = [
  {
    category: "Interface",
    drivebase:
      "Modern web UI with file browser, settings, and workspace flows.",
    rclone: "CLI-first workflow for power users and scripts.",
  },
  {
    category: "Collaboration",
    drivebase: "Workspaces, roles, and invite links for teams.",
    rclone: "No built-in team workspace or membership model.",
  },
  {
    category: "Automation",
    drivebase:
      "Rule-based smart uploads and app-level workflows from a central dashboard.",
    rclone: "Powerful scripting through shell commands and cron jobs.",
  },
  {
    category: "Security",
    drivebase: "Vault workflows and role-based access controls in app.",
    rclone: "Encryption and remote config through command-line features.",
  },
  {
    category: "Self-hosting",
    drivebase: "Self-hosted product with API + web app experience.",
    rclone: "Single binary, lightweight local/server execution.",
  },
];

export default function DrivebaseVsRclonePage() {
  return (
    <main className="flex flex-1 flex-col bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-7xl border-x border-white/10">
        <section className="px-6 pb-14 pt-20 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Versus
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            Drivebase vs rclone
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            Both tools help you work across multiple storage providers. The main
            difference is how you operate: app-first collaboration and workflows
            with Drivebase, or CLI-first control with rclone.
          </p>
        </section>

        <section className="px-6 pb-12 lg:px-8">
          <div className="border border-white/10 bg-transparent">
            <div className="grid grid-cols-12 border-b border-white/10 px-6 py-4 text-sm font-semibold text-gray-300">
              <div className="col-span-3">Category</div>
              <div className="col-span-4">Drivebase</div>
              <div className="col-span-5">rclone</div>
            </div>

            {comparisonRows.map((row) => (
              <div
                key={row.category}
                className="grid grid-cols-12 gap-4 border-b border-white/10 px-6 py-5 last:border-b-0"
              >
                <div className="col-span-12 text-sm font-semibold text-white md:col-span-3">
                  {row.category}
                </div>
                <div className="col-span-12 text-sm leading-7 text-gray-300 md:col-span-4">
                  {row.drivebase}
                </div>
                <div className="col-span-12 text-sm leading-7 text-gray-300 md:col-span-5">
                  {row.rclone}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 px-6 pb-16 lg:grid-cols-2 lg:px-8">
          <article className="border border-white/10 bg-transparent p-6">
            <h2 className="text-lg font-semibold text-white">
              Drivebase best fit
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
              <li>Team workspaces with role-based access and invites.</li>
              <li>Visual file operations without day-to-day CLI commands.</li>
              <li>
                One product layer for providers, permissions, and workflows.
              </li>
            </ul>
          </article>

          <article className="border border-white/10 bg-transparent p-6">
            <h2 className="text-lg font-semibold text-white">
              rclone best fit
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
              <li>Pure command-line workflows and shell-level scripting.</li>
              <li>A minimal binary with low overhead and direct control.</li>
              <li>Tooling focused on sync/copy/mount primitives.</li>
            </ul>
          </article>
        </section>

        <section className="px-6 pb-24 lg:px-8">
          <div className="border border-white/10 bg-transparent p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-white">
              Explore Drivebase
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
              Review setup and deployment docs to evaluate whether Drivebase
              fits your team better than a CLI-only stack.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/docs/quick-start"
                className="border border-white px-5 py-2 text-sm font-semibold text-black bg-white hover:bg-gray-200"
              >
                Quick Start
              </Link>
              <Link
                href="/docs/deployment"
                className="border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Deployment Guide
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
