import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { loadTypedefs } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";

import { scalarsResolvers } from "./modules/scalars.ts";
import { resolvers as authResolvers } from "./modules/auth/index.ts";
import { resolvers as oauthAppsResolvers } from "./modules/oauth-apps/index.ts";
import { resolvers as providersResolvers } from "./modules/providers/index.ts";
import { resolvers as nodesResolvers } from "./modules/nodes/index.ts";
import { resolvers as usageResolvers } from "./modules/usage/index.ts";
import { resolvers as operationsResolvers } from "./modules/operations/index.ts";
import { resolvers as uploadsResolvers } from "./modules/uploads/index.ts";

/**
 * Load every `*.gql` file under `graphql/modules/**` and merge them with
 * the hand-authored resolvers. Kept async because `loadTypedefs` does I/O
 * and we want that to happen once at boot.
 */
export async function buildSchema() {
  const modulesDir = resolve(
    fileURLToPath(new URL(".", import.meta.url)),
    "modules",
  );
  const sources = await loadTypedefs(`${modulesDir}/**/*.gql`, {
    loaders: [new GraphQLFileLoader()],
  });
  const typeDefs = mergeTypeDefs(
    sources.map((s) => s.document).filter((d): d is NonNullable<typeof d> => !!d),
  );
  const resolvers = mergeResolvers([
    scalarsResolvers,
    authResolvers,
    oauthAppsResolvers,
    providersResolvers,
    nodesResolvers,
    usageResolvers,
    operationsResolvers,
    uploadsResolvers,
  ]);
  return makeExecutableSchema({ typeDefs, resolvers });
}
