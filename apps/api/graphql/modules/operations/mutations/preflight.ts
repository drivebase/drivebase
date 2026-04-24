import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { preflight as runPreflight } from "~/services/orchestrator/index.ts";
import { flattenPlanEntry } from "../helpers.ts";
import { normalizePreflightInput } from "../input.ts";

/** Build a plan and persist the operation. Always returns ready — no conflict detection at preflight time. */
export const preflight: MutationResolvers["preflight"] = async (
  _parent,
  { input },
  ctx,
) => {
  const user = requireUser(ctx);
  const normalized = normalizePreflightInput(input);
  const result = await runPreflight({
    deps: { db: ctx.db, config: ctx.config, registry: ctx.registry },
    userId: user.id,
    input: normalized,
  });
  ctx.log.info(
    { operationId: result.operationId, status: result.status, entries: result.summary.totalEntries },
    "preflight done",
  );
  return {
    id: result.id,
    operationId: result.operationId,
    status: result.status,
    summary: result.summary,
    entries: result.entries.map(flattenPlanEntry),
  };
};
