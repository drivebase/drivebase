/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ok\n    }\n  }\n": typeof types.RegisterDocument,
    "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n    }\n  }\n": typeof types.LoginDocument,
    "\n  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {\n    forgotPasswordSendCode(input: $input) {\n      ok\n    }\n  }\n": typeof types.ForgotPasswordSendCodeDocument,
    "\n  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {\n    forgotPasswordVerifyCode(input: $input) {\n      ok\n    }\n  }\n": typeof types.ForgotPasswordVerifyCodeDocument,
    "\n  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {\n    forgotPasswordReset(input: $input) {\n      ok\n    }\n  }\n": typeof types.ForgotPasswordResetDocument,
    "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n": typeof types.CreateWorkspaceDocument,
    "\n  query GetMe {\n    me {\n      name\n    }\n  }\n": typeof types.GetMeDocument,
};
const documents: Documents = {
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ok\n    }\n  }\n": types.RegisterDocument,
    "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n    }\n  }\n": types.LoginDocument,
    "\n  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {\n    forgotPasswordSendCode(input: $input) {\n      ok\n    }\n  }\n": types.ForgotPasswordSendCodeDocument,
    "\n  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {\n    forgotPasswordVerifyCode(input: $input) {\n      ok\n    }\n  }\n": types.ForgotPasswordVerifyCodeDocument,
    "\n  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {\n    forgotPasswordReset(input: $input) {\n      ok\n    }\n  }\n": types.ForgotPasswordResetDocument,
    "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n": types.CreateWorkspaceDocument,
    "\n  query GetMe {\n    me {\n      name\n    }\n  }\n": types.GetMeDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ok\n    }\n  }\n"): typeof import('./graphql').RegisterDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n    }\n  }\n"): typeof import('./graphql').LoginDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {\n    forgotPasswordSendCode(input: $input) {\n      ok\n    }\n  }\n"): typeof import('./graphql').ForgotPasswordSendCodeDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {\n    forgotPasswordVerifyCode(input: $input) {\n      ok\n    }\n  }\n"): typeof import('./graphql').ForgotPasswordVerifyCodeDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {\n    forgotPasswordReset(input: $input) {\n      ok\n    }\n  }\n"): typeof import('./graphql').ForgotPasswordResetDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n"): typeof import('./graphql').CreateWorkspaceDocument;
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetMe {\n    me {\n      name\n    }\n  }\n"): typeof import('./graphql').GetMeDocument;


export function gql(source: string) {
  return (documents as any)[source] ?? {};
}
