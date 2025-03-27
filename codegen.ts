import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:8000/graphql',
  documents: ['web/gql/**/*.ts'],
  generates: {
    './sdk/gql/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        documentMode: 'string',
      },
    },
    'web/gql/hooks.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withComponent: true,
      },
    },
  },
};

export default config;
