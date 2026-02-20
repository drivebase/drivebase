import { Shield, UserSquare2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Team Collaboration - Drivebase",
  description:
    "Team Collaboration helps teams share files, manage workspace access, and apply granular permissions in Drivebase.",
};

export default function TeamCollaborationPage() {
  return (
    <main className="flex flex-1 flex-col bg-[#050505] text-white">
      <section className="mx-auto w-full max-w-7xl px-6 pb-14 pt-20 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Features
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Team Collaboration built for shared workspaces
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Share files and folders with teammates, apply scoped permissions, and
          keep access management clear as your organization grows.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-3 lg:px-8">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Users className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Shared workspace model</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Organize people into workspaces where content and permissions are
            managed centrally.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Shield className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Granular permissions</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Control who can view, edit, or administer files and folders.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <UserSquare2 className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Simple onboarding</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Invite teammates, assign roles, and keep collaboration flowing with
            fewer manual steps.
          </p>
        </article>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <h2 className="text-2xl font-semibold">
            Collaborate with confidence
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
            Bring your team into a shared workspace and apply access rules that
            fit your operations.
          </p>
          <div className="mt-6">
            <Link
              href="/docs"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Explore Docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
