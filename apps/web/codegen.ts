import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
	overwrite: true,
	ignoreNoDocuments: true,
	schema: "../../apps/api/graphql/schema/**/*.graphql",
	documents: ["src/**/*.tsx", "src/**/*.ts"],
	generates: {
		"src/gql/": {
			preset: "client",
			plugins: [],
			config: {
				useTypeImports: true,
			},
		},
	},
};

export default config;
