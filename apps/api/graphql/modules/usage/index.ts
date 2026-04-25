import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { transferStats } from "./queries/transferStats.ts";

export const resolvers: Resolvers = {
  Query: { transferStats },
};
