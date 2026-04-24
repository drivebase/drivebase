import type { OperationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { flattenPlanEntry, planFromRow } from "../helpers.ts";

/** Entries come from `operations.plan`; empty until preflight populates. */
export const entries: OperationResolvers["entries"] = (parent) => {
  const plan = planFromRow(parent.plan);
  return plan ? plan.entries.map(flattenPlanEntry) : [];
};
