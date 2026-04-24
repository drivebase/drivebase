import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { listChildren } from "./queries/listChildren.ts";
import { createFolder } from "./mutations/createFolder.ts";
import { renameNode } from "./mutations/renameNode.ts";

export const resolvers: Resolvers = {
  Query: { listChildren },
  Mutation: { createFolder, renameNode },
};
