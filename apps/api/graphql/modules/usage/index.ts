import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";

// Usage is a pure data type — Provider.usage (providers/field/usage.ts)
// is the only place it's fetched. No resolvers to declare here, but the
// module exists so the SDL file is picked up by schema loading.
export const resolvers: Resolvers = {};
