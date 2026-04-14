import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../internal/graph/schema/*.graphqls",
  documents: ["src/**/*.tsx", "src/**/*.ts"],
  ignoreNoDocuments: true,
  generates: {
    "./src/gql/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "graphql",
        fragmentMasking: { unmaskFunctionName: "getFragmentData" },
      },
      config: {
        useTypeImports: true,
      },
    },
  },
};

export default config;
