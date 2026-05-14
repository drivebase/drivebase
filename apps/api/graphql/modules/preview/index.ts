import type { GraphQLContext } from "~/graphql/context.ts";
import { requireUser } from "~/graphql/errors.ts";
import { previewChannel, type PreviewReadyPayload } from "~/pubsub.ts";

export const resolvers = {
  Subscription: {
    previewReady: {
      subscribe: (
        _parent: unknown,
        { nodeId }: { nodeId: string },
        ctx: GraphQLContext,
      ) => {
        requireUser(ctx);
        return ctx.pubsub.subscribe(
          previewChannel(nodeId) as `preview:${string}:ready`,
        );
      },
      resolve: (payload: PreviewReadyPayload) => payload,
    },
  },
};
