import type { CodegenConfig } from "@graphql-codegen/cli"

/**
 * Generates fully-typed GraphQL documents and hooks for the DriveOS frontend.
 *
 * Schema source: the SDL files under `apps/api/graphql/modules`. We use the
 * raw SDL (not introspection) so codegen doesn't require the API to be up.
 *
 * Output: `src/gql/generated/` — import from `@drivebase/data/gql`.
 *
 * Uses the modern client-preset which emits a type-safe `graphql()` function
 * (aka "gql.tada"-style) plus urql-aware document nodes.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: ["../../apps/api/graphql/modules/**/*.gql"],
  documents: ["src/gql/operations/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "src/gql/__generated__/": {
      preset: "client",
      config: {
        scalars: {
          DateTime: "string",
          BigInt: "string | number",
          JSON: "unknown",
          ID: "string",
        },
        useTypeImports: true,
        enumsAsTypes: true,
        avoidOptionals: { field: true, inputValue: false, object: true },
        skipTypename: false,
      },
      presetConfig: {
        fragmentMasking: false,
      },
    },
  },
}

export default config
