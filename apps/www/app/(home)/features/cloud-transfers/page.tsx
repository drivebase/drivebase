import { ArrowRightLeft, Cloud, TimerReset } from "lucide-react";
import Link from "next/link";

export default function CloudTransfersPage() {
  return (
    <main className="flex flex-1 flex-col bg-[#050505] text-white">
      <section className="mx-auto w-full max-w-7xl px-6 pb-14 pt-20 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Features
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Cloud Transfers moves files between providers
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Transfer data across storage providers from one place, without
          downloading files to local machines first.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-3 lg:px-8">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <ArrowRightLeft className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">
            Provider-to-provider moves
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Shift data between S3, Drive, local storage, and more through one
            unified workflow.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <TimerReset className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Background execution</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Kick off transfers and keep working while jobs continue in the
            background.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Cloud className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Migration-ready</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Useful for provider changes, tenant migrations, and storage
            rebalancing.
          </p>
        </article>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <h2 className="text-2xl font-semibold">
            Start your next cloud migration
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
            Connect providers and orchestrate transfers from one dashboard.
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
