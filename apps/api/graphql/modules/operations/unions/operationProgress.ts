import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";

/**
 * Discriminator for the `OperationProgress` union. The Redis bridge always
 * forwards payloads that carry a `kind` field (see pubsub.ts); we map each
 * to its GraphQL type name.
 */
export const OperationProgress: Resolvers["OperationProgress"] = {
  __resolveType(payload) {
    if (payload && typeof payload === "object" && "kind" in payload) {
      switch (payload.kind) {
        case "progress":
          return "ProgressEvent";
        case "status":
          return "JobStatusEvent";
        case "operation":
          return "OperationStatusEvent";
        case "conflict":
          return "ConflictDiscoveredEvent";
      }
    }
    return null;
  },
};
