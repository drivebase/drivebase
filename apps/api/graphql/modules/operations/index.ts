import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { operation } from "./queries/operation.ts";
import { myOperations } from "./queries/myOperations.ts";
import { preflight } from "./mutations/preflight.ts";
import { executePlan } from "./mutations/executePlan.ts";
import { resolveConflict } from "./mutations/resolveConflict.ts";
import { cancelOperation } from "./mutations/cancelOperation.ts";
import { entries } from "./field/entries.ts";
import { jobCounts } from "./field/jobCounts.ts";
import { operationProgress } from "./subscriptions/operationProgress.ts";
import { OperationProgress } from "./unions/operationProgress.ts";

export const resolvers: Resolvers = {
  Query: { operation, myOperations },
  Mutation: { preflight, executePlan, resolveConflict, cancelOperation },
  Subscription: { operationProgress },
  Operation: { entries, jobCounts },
  OperationProgress,
};
