import { FileStack, Route, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export default function SmartUploadPage() {
  return (
    <main className="flex flex-1 flex-col bg-[#050505] text-white">
      <section className="mx-auto w-full max-w-7xl px-6 pb-14 pt-20 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-400">
          Features
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Smart Upload routes files where they belong
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">
          Define upload rules once and let Drivebase choose the destination
          provider automatically for every incoming file.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-3 lg:px-8">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Route className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Rule-based routing</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Route by file type, size, and upload path without changing app code.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <SlidersHorizontal className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Flexible control</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Tune rules as your storage strategy changes across teams and
            environments.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <FileStack className="size-6 text-indigo-400" />
          <h2 className="mt-4 text-lg font-semibold">Cleaner operations</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Reduce manual moves and keep data organized from the first upload.
          </p>
        </article>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <h2 className="text-2xl font-semibold">Automate your upload paths</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
            Set up your first routing rules and keep incoming files flowing to
            the right provider.
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
