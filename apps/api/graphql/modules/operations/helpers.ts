import type { PlanEntry } from "@drivebase/storage";
import type { PlanEntryMapper } from "~/graphql/mappers.ts";
import type { StoredPlan } from "~/services/orchestrator/types.ts";

export function flattenPlanEntry(e: PlanEntry): PlanEntryMapper {
  return {
    kind: e.kind,
    srcPath: e.src?.path ?? null,
    srcName: e.src?.name ?? null,
    dstPath: e.dst.path,
    dstName: e.dst.name,
    size: e.size ?? null,
  };
}

export function planFromRow(plan: unknown): StoredPlan | null {
  if (!plan || typeof plan !== "object") return null;
  const p = plan as Partial<StoredPlan>;
  if (!Array.isArray(p.entries)) return null;
  return p as StoredPlan;
}
