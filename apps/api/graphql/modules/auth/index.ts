import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { viewer } from "./queries/viewer.ts";

export const resolvers: Resolvers = {
  Query: { viewer },
};
