import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { myOAuthApps } from "./queries/myOAuthApps.ts";
import { createOAuthApp } from "./mutations/createOAuthApp.ts";
import { deleteOAuthApp } from "./mutations/deleteOAuthApp.ts";

export const resolvers: Resolvers = {
  Query: { myOAuthApps },
  Mutation: { createOAuthApp, deleteOAuthApp },
};
