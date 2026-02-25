import type { InferPageType } from "fumadocs-core/source";

type RoadmapPage = InferPageType<typeof import("@/lib/source").roadmap>;

export type RoadmapListItem = {
  url: RoadmapPage["url"];
  data: Pick<RoadmapPage["data"], "title" | "version" | "date" | "features">;
};
