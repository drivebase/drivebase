import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";

export const viewer: QueryResolvers["viewer"] = (_parent, _args, ctx) =>
  ctx.user;
