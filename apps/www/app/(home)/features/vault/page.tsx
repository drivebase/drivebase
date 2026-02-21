import { KeyRound, Lock, ShieldCheck, UserRoundCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vault - Drivebase",
  description:
    "Vault provides end-to-end encrypted file storage through Drivebase, with encrypted uploads proxied to your configured storage provider.",
};

export default function VaultPage() {
  return (
    <main className="flex flex-1 flex-col bg-[#050505] text-white">
      <section className="mx-auto w-full max-w-7xl px-6 pb-14 pt-20 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Features
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Vault keeps your private files protected by default
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Vault is a dedicated encrypted area accessed through Drivebase for
          sensitive files. Encryption happens in the browser before transfer,
          and Drivebase proxies encrypted payloads to your configured storage
          provider.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-2 lg:px-8">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Lock className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-xl font-semibold">Private by design</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Files are encrypted before they leave the browser, so the backend
            only handles ciphertext.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <KeyRound className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-xl font-semibold">Passphrase controlled</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Vault access is tied to your passphrase, and unlocking is required
            per session.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <ShieldCheck className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-xl font-semibold">
            Isolated from regular files
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Vault content stays separated from normal file views to reduce
            accidental exposure.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <UserRoundCheck className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-xl font-semibold">
            Backup and restore support
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            You can keep an encrypted backup of your vault key material for
            recovery if needed.
          </p>
        </article>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-8">
        <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-8 sm:p-10">
          <h2 className="text-2xl font-semibold">Ready to enable Vault?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
            Start with a passphrase, unlock your vault, and upload encrypted
            files in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/docs/quick-start"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Get Started
            </Link>
            <Link
              href="/docs/vault"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Read Vault Docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
