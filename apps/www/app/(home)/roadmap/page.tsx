import { RoadmapList } from "@/components/roadmap/roadmap-list";
import { roadmap } from "@/lib/source";
import type { RoadmapListItem } from "@/lib/types";

export const metadata = {
  title: "Roadmap",
  description:
    "The future of Drivebase. See what we've built and what's coming next.",
};

export default function RoadmapPage() {
  const pages = roadmap.getPages().sort((a, b) => {
    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
  });

  // Keep only serializable frontmatter for the client component.
  const items: RoadmapListItem[] = pages.map((page) => ({
    url: page.url,
    data: {
      title: page.data.title,
      version: page.data.version,
      date: page.data.date,
      features: page.data.features,
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
            <RoadmapList items={items} />
          </div>
        </div>
      </div>
    </main>
  );
}
