/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

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
    "\n  mutation GenerateUploadKey {\n    generateUploadKey \n  }\n": typeof types.GenerateUploadKeyDocument,
    "\n  mutation CreateFolder($input: CreateFolderInput!) {\n    createFolder(input: $input) {\n      id\n    }\n  }\n": typeof types.CreateFolderDocument,
    "\n  mutation StarFile($id: String!) {\n    starFile(id: $id) {\n      ok\n    }\n  }\n": typeof types.StarFileDocument,
    "\n  mutation UnstarFile($id: String!) {\n    unstarFile(id: $id) {\n      ok\n    }\n  }\n": typeof types.UnstarFileDocument,
    "\n  mutation RenameFile($id: String!, $name: String!) {\n    renameFile(id: $id, name: $name) {\n      ok\n    }\n  }\n": typeof types.RenameFileDocument,
    "\n  mutation DeleteFile($id: String!) {\n    deleteFile(id: $id) {\n      ok\n    }\n  }\n": typeof types.DeleteFileDocument,
    "\n  mutation GetAuthUrl($input: GetAuthUrlInput!) {\n    getAuthUrl(input: $input) {\n      url\n    }\n  }\n": typeof types.GetAuthUrlDocument,
    "\n  mutation AuthorizeApiKey($input: AuthorizeApiKeyInput!) {\n    authorizeApiKey(input: $input) {\n      id\n    }\n  }\n": typeof types.AuthorizeApiKeyDocument,
    "\n  mutation HandleOAuthCallback($input: HandleOAuthCallbackInput!) {\n    handleOAuthCallback(input: $input) {\n      id\n    }\n  }\n": typeof types.HandleOAuthCallbackDocument,
    "\n  mutation ConnectLocalProvider($input: ConnectLocalProviderInput!) {\n    connectLocalProvider(input: $input) {\n      id\n    }\n  }\n": typeof types.ConnectLocalProviderDocument,
    "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n": typeof types.CreateWorkspaceDocument,
    "\n  query GetMe {\n    me {\n      name\n      email\n    }\n  }\n": typeof types.GetMeDocument,
    "\n  query GetFiles($input: ListFilesInput!) {\n    listFiles(input: $input) {\n      data {\n        id\n        name\n        path\n        isFolder\n        isStarred\n        size\n        mimeType\n        createdAt\n        updatedAt\n      }\n      meta {\n        total\n        page\n        limit\n        totalPages\n      }\n    }\n  }\n": typeof types.GetFilesDocument,
    "\n  query GetAvailableProviders {\n    availableProviders {\n      displayName\n      authType\n      type\n      configSchema {\n        fields {\n          id\n          type\n          label\n          description\n          default\n        }\n        required\n      }\n    }\n  }\n": typeof types.GetAvailableProvidersDocument,
    "\n  query GetConnectedProviders {\n    connectedProviders {\n      id\n      name\n      type\n      authType\n      metadata\n      createdAt\n    }\n  }\n": typeof types.GetConnectedProvidersDocument,
    "\n  query GetVersion {\n    version\n  }\n": typeof types.GetVersionDocument,
    "\n  query Ping {\n    ping {\n      time\n      startedAt\n    }\n  }\n": typeof types.PingDocument,
    "\n  query GetCurrentWorkspace {\n    currentWorkspace {\n      id\n    }\n  }\n": typeof types.GetCurrentWorkspaceDocument,
    "\n  query GetWorkspaces {\n    workspaces {\n      id\n      name\n      createdAt\n    }\n  }\n": typeof types.GetWorkspacesDocument,
    "\n  query GetWorkspaceStats {\n    workspaceStats {\n      title\n      count\n      size\n    }\n  }\n": typeof types.GetWorkspaceStatsDocument,
};
const documents: Documents = {
    "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ok\n    }\n  }\n": types.RegisterDocument,
    "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n    }\n  }\n": types.LoginDocument,
    "\n  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {\n    forgotPasswordSendCode(input: $input) {\n      ok\n    }\n  }\n": types.ForgotPasswordSendCodeDocument,
    "\n  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {\n    forgotPasswordVerifyCode(input: $input) {\n      ok\n    }\n  }\n": types.ForgotPasswordVerifyCodeDocument,
    "\n  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {\n    forgotPasswordReset(input: $input) {\n      ok\n    }\n  }\n": types.ForgotPasswordResetDocument,
    "\n  mutation GenerateUploadKey {\n    generateUploadKey \n  }\n": types.GenerateUploadKeyDocument,
    "\n  mutation CreateFolder($input: CreateFolderInput!) {\n    createFolder(input: $input) {\n      id\n    }\n  }\n": types.CreateFolderDocument,
    "\n  mutation StarFile($id: String!) {\n    starFile(id: $id) {\n      ok\n    }\n  }\n": types.StarFileDocument,
    "\n  mutation UnstarFile($id: String!) {\n    unstarFile(id: $id) {\n      ok\n    }\n  }\n": types.UnstarFileDocument,
    "\n  mutation RenameFile($id: String!, $name: String!) {\n    renameFile(id: $id, name: $name) {\n      ok\n    }\n  }\n": types.RenameFileDocument,
    "\n  mutation DeleteFile($id: String!) {\n    deleteFile(id: $id) {\n      ok\n    }\n  }\n": types.DeleteFileDocument,
    "\n  mutation GetAuthUrl($input: GetAuthUrlInput!) {\n    getAuthUrl(input: $input) {\n      url\n    }\n  }\n": types.GetAuthUrlDocument,
    "\n  mutation AuthorizeApiKey($input: AuthorizeApiKeyInput!) {\n    authorizeApiKey(input: $input) {\n      id\n    }\n  }\n": types.AuthorizeApiKeyDocument,
    "\n  mutation HandleOAuthCallback($input: HandleOAuthCallbackInput!) {\n    handleOAuthCallback(input: $input) {\n      id\n    }\n  }\n": types.HandleOAuthCallbackDocument,
    "\n  mutation ConnectLocalProvider($input: ConnectLocalProviderInput!) {\n    connectLocalProvider(input: $input) {\n      id\n    }\n  }\n": types.ConnectLocalProviderDocument,
    "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n": types.CreateWorkspaceDocument,
    "\n  query GetMe {\n    me {\n      name\n      email\n    }\n  }\n": types.GetMeDocument,
    "\n  query GetFiles($input: ListFilesInput!) {\n    listFiles(input: $input) {\n      data {\n        id\n        name\n        path\n        isFolder\n        isStarred\n        size\n        mimeType\n        createdAt\n        updatedAt\n      }\n      meta {\n        total\n        page\n        limit\n        totalPages\n      }\n    }\n  }\n": types.GetFilesDocument,
    "\n  query GetAvailableProviders {\n    availableProviders {\n      displayName\n      authType\n      type\n      configSchema {\n        fields {\n          id\n          type\n          label\n          description\n          default\n        }\n        required\n      }\n    }\n  }\n": types.GetAvailableProvidersDocument,
    "\n  query GetConnectedProviders {\n    connectedProviders {\n      id\n      name\n      type\n      authType\n      metadata\n      createdAt\n    }\n  }\n": types.GetConnectedProvidersDocument,
    "\n  query GetVersion {\n    version\n  }\n": types.GetVersionDocument,
    "\n  query Ping {\n    ping {\n      time\n      startedAt\n    }\n  }\n": types.PingDocument,
    "\n  query GetCurrentWorkspace {\n    currentWorkspace {\n      id\n    }\n  }\n": types.GetCurrentWorkspaceDocument,
    "\n  query GetWorkspaces {\n    workspaces {\n      id\n      name\n      createdAt\n    }\n  }\n": types.GetWorkspacesDocument,
    "\n  query GetWorkspaceStats {\n    workspaceStats {\n      title\n      count\n      size\n    }\n  }\n": types.GetWorkspaceStatsDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation Register($input: RegisterInput!) {\n    register(input: $input) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n    }\n  }\n"): (typeof documents)["\n  mutation Login($input: LoginInput!) {\n    login(input: $input) {\n      accessToken\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {\n    forgotPasswordSendCode(input: $input) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {\n    forgotPasswordSendCode(input: $input) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {\n    forgotPasswordVerifyCode(input: $input) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {\n    forgotPasswordVerifyCode(input: $input) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {\n    forgotPasswordReset(input: $input) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {\n    forgotPasswordReset(input: $input) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation GenerateUploadKey {\n    generateUploadKey \n  }\n"): (typeof documents)["\n  mutation GenerateUploadKey {\n    generateUploadKey \n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateFolder($input: CreateFolderInput!) {\n    createFolder(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateFolder($input: CreateFolderInput!) {\n    createFolder(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation StarFile($id: String!) {\n    starFile(id: $id) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation StarFile($id: String!) {\n    starFile(id: $id) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UnstarFile($id: String!) {\n    unstarFile(id: $id) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation UnstarFile($id: String!) {\n    unstarFile(id: $id) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation RenameFile($id: String!, $name: String!) {\n    renameFile(id: $id, name: $name) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation RenameFile($id: String!, $name: String!) {\n    renameFile(id: $id, name: $name) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation DeleteFile($id: String!) {\n    deleteFile(id: $id) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteFile($id: String!) {\n    deleteFile(id: $id) {\n      ok\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation GetAuthUrl($input: GetAuthUrlInput!) {\n    getAuthUrl(input: $input) {\n      url\n    }\n  }\n"): (typeof documents)["\n  mutation GetAuthUrl($input: GetAuthUrlInput!) {\n    getAuthUrl(input: $input) {\n      url\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation AuthorizeApiKey($input: AuthorizeApiKeyInput!) {\n    authorizeApiKey(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation AuthorizeApiKey($input: AuthorizeApiKeyInput!) {\n    authorizeApiKey(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation HandleOAuthCallback($input: HandleOAuthCallbackInput!) {\n    handleOAuthCallback(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation HandleOAuthCallback($input: HandleOAuthCallbackInput!) {\n    handleOAuthCallback(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ConnectLocalProvider($input: ConnectLocalProviderInput!) {\n    connectLocalProvider(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation ConnectLocalProvider($input: ConnectLocalProviderInput!) {\n    connectLocalProvider(input: $input) {\n      id\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n"): (typeof documents)["\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n    }\n  }  \n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetMe {\n    me {\n      name\n      email\n    }\n  }\n"): (typeof documents)["\n  query GetMe {\n    me {\n      name\n      email\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetFiles($input: ListFilesInput!) {\n    listFiles(input: $input) {\n      data {\n        id\n        name\n        path\n        isFolder\n        isStarred\n        size\n        mimeType\n        createdAt\n        updatedAt\n      }\n      meta {\n        total\n        page\n        limit\n        totalPages\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetFiles($input: ListFilesInput!) {\n    listFiles(input: $input) {\n      data {\n        id\n        name\n        path\n        isFolder\n        isStarred\n        size\n        mimeType\n        createdAt\n        updatedAt\n      }\n      meta {\n        total\n        page\n        limit\n        totalPages\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAvailableProviders {\n    availableProviders {\n      displayName\n      authType\n      type\n      configSchema {\n        fields {\n          id\n          type\n          label\n          description\n          default\n        }\n        required\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetAvailableProviders {\n    availableProviders {\n      displayName\n      authType\n      type\n      configSchema {\n        fields {\n          id\n          type\n          label\n          description\n          default\n        }\n        required\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetConnectedProviders {\n    connectedProviders {\n      id\n      name\n      type\n      authType\n      metadata\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetConnectedProviders {\n    connectedProviders {\n      id\n      name\n      type\n      authType\n      metadata\n      createdAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetVersion {\n    version\n  }\n"): (typeof documents)["\n  query GetVersion {\n    version\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query Ping {\n    ping {\n      time\n      startedAt\n    }\n  }\n"): (typeof documents)["\n  query Ping {\n    ping {\n      time\n      startedAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetCurrentWorkspace {\n    currentWorkspace {\n      id\n    }\n  }\n"): (typeof documents)["\n  query GetCurrentWorkspace {\n    currentWorkspace {\n      id\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetWorkspaces {\n    workspaces {\n      id\n      name\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query GetWorkspaces {\n    workspaces {\n      id\n      name\n      createdAt\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetWorkspaceStats {\n    workspaceStats {\n      title\n      count\n      size\n    }\n  }\n"): (typeof documents)["\n  query GetWorkspaceStats {\n    workspaceStats {\n      title\n      count\n      size\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;