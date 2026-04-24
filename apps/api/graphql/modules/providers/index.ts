import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";
import { providerTypes } from "./queries/providerTypes.ts";
import { myProviders } from "./queries/myProviders.ts";
import { provider } from "./queries/provider.ts";
import { connectProvider } from "./mutations/connectProvider.ts";
import { disconnectProvider } from "./mutations/disconnectProvider.ts";
import { refreshUsage } from "./mutations/refreshUsage.ts";
import { beginProviderOAuth } from "./mutations/beginProviderOAuth.ts";
import { completeProviderOAuth } from "./mutations/completeProviderOAuth.ts";
import { usage } from "./field/usage.ts";

export const resolvers: Resolvers = {
  Query: { providerTypes, myProviders, provider },
  Mutation: {
    connectProvider,
    disconnectProvider,
    refreshUsage,
    beginProviderOAuth,
    completeProviderOAuth,
  },
  Provider: { usage },
};
