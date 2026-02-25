import { roadmap } from "@/lib/source";
import { RoadmapList } from "@/components/roadmap/roadmap-list";

export const metadata = {
  title: "Roadmap",
  description:
    "The future of Drivebase. See what we've built and what's coming next.",
};

export default function RoadmapPage() {
  const pages = roadmap.getPages().sort((a, b) => {
    // Sort by version descending (assuming vX.Y.Z format)
    return b.data.version.localeCompare(a.data.version, undefined, {
      numeric: true,
    });
  });

  // Map to a serializable format for the client component
  const items = pages.map((page) => ({
    url: page.url,
    data: {
      title: page.data.title,
      version: page.data.version,
      description: page.data.description,
      features: page.data.features,
      status: page.data.status,
      date:
        page.data.date instanceof Date
          ? page.data.date.toISOString()
          : page.data.date,
    },
  }));

  return (
    <main className="relative min-h-screen pt-24 pb-16 sm:pb-24 lg:pb-32 overflow-hidden">
      {/* Background patterns matching Hero */}
      <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(120,119,255,0.1),transparent)]" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-400 pb-2">
            Roadmap
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            The future of Drivebase. See what we've built and what's coming
            next.
          </p>
        </div>

        <RoadmapList items={items as any} />
      </div>
    </main>
  );
}
