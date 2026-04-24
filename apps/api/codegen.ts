import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Generates `graphql/__generated__/resolvers.ts` from every `*.gql` file
 * under `graphql/modules`. The context type flows in from `context.ts` so
 * resolvers get strongly-typed `ctx` automatically.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: "./graphql/modules/**/*.gql",
  generates: {
    "./graphql/__generated__/resolvers.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        useTypeImports: true,
        contextType: "~/graphql/context#GraphQLContext",
        scalars: {
          DateTime: "Date",
          BigInt: "bigint | number",
          JSON: "unknown",
        },
        enumsAsTypes: true,
        avoidOptionals: { field: true },
        makeResolverTypeCallable: true,
        mappers: {
          Provider: "~/graphql/mappers#ProviderMapper",
          Node: "~/graphql/mappers#NodeMapper",
          Usage: "~/graphql/mappers#UsageMapper",
          OAuthApp: "~/graphql/mappers#OAuthAppMapper",
          User: "~/graphql/mappers#UserMapper",
          Operation: "~/graphql/mappers#OperationMapper",
          UploadSession: "~/graphql/mappers#UploadSessionMapper",
          PlanEntry: "~/graphql/mappers#PlanEntryMapper",
          ProgressEvent: "~/graphql/mappers#ProgressEventMapper",
          JobStatusEvent: "~/graphql/mappers#JobStatusEventMapper",
          OperationStatusEvent: "~/graphql/mappers#OperationStatusEventMapper",
          ConflictDiscoveredEvent: "~/graphql/mappers#ConflictDiscoveredEventMapper",
        },
      },
    },
  },
};

export default config;
