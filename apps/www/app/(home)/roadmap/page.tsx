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
    <main className="min-h-screen pb-16 sm:pb-24 lg:pb-32 bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-l border-r border-border">
        <div className="pt-16">
          <div className="px-6 py-12 sm:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Roadmap
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                The future of Drivebase. See what we've built and what's coming
                next.
              </p>
            </div>
          </div>
          <div className="h-px w-full bg-border" />

          <div className="px-6 py-10 sm:py-12">
            <RoadmapList items={items as any} />
          </div>
        </div>
      </div>
    </main>
  );
}
