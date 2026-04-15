/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

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
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n": typeof types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n": typeof types.SignUpDocument,
    "\n  mutation SignOut {\n    signOut\n  }\n": typeof types.SignOutDocument,
    "\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n": typeof types.RequestPasswordResetDocument,
    "\n  mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!) {\n    resetPassword(email: $email, otp: $otp, newPassword: $newPassword)\n  }\n": typeof types.ResetPasswordDocument,
    "\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n": typeof types.MeDocument,
    "\n  query DashboardStats {\n    providers {\n      id\n      name\n      type\n      status\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n      }\n    }\n    bandwidthUsage {\n      direction\n      totalBytes\n      periodStart\n      periodEnd\n    }\n    myUploadBatches {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n    myTransferJobs {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n  }\n": typeof types.DashboardStatsDocument,
    "\n  mutation ConnectProvider($input: ConnectProviderInput!) {\n    connectProvider(input: $input) {\n      id\n      name\n      type\n      status\n    }\n  }\n": typeof types.ConnectProviderDocument,
    "\n  mutation DisconnectProvider($id: UUID!) {\n    disconnectProvider(id: $id)\n  }\n": typeof types.DisconnectProviderDocument,
    "\n  mutation InitiateOAuth($oauthAppID: UUID!, $providerName: String!) {\n    initiateOAuth(oauthAppID: $oauthAppID, providerName: $providerName)\n  }\n": typeof types.InitiateOAuthDocument,
    "\n  mutation SaveOAuthApp($input: SaveOAuthAppInput!) {\n    saveOAuthApp(input: $input) {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n": typeof types.SaveOAuthAppDocument,
    "\n  mutation ValidateProvider($id: UUID!) {\n    validateProvider(id: $id) {\n      ok\n      error\n    }\n  }\n": typeof types.ValidateProviderDocument,
    "\n  query OAuthApps {\n    oauthApps {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n": typeof types.OAuthAppsDocument,
    "\n  query Providers {\n    providers {\n      id\n      name\n      type\n      status\n      createdAt\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n        syncedAt\n      }\n    }\n  }\n": typeof types.ProvidersDocument,
    "\n  query AvailableProviders {\n    availableProviders {\n      type\n      label\n      description\n      authType\n      fields {\n        name\n        label\n        type\n        required\n        placeholder\n        description\n        secret\n      }\n    }\n  }\n": typeof types.AvailableProvidersDocument,
    "\n  mutation SwitchWorkspace($workspaceID: UUID!) {\n    switchWorkspace(workspaceID: $workspaceID) {\n      accessToken\n    }\n  }\n": typeof types.SwitchWorkspaceDocument,
    "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.CreateWorkspaceDocument,
    "\n  query MyWorkspaces {\n    myWorkspaces {\n      id\n      name\n      slug\n    }\n  }\n": typeof types.MyWorkspacesDocument,
};
const documents: Documents = {
    "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n": types.SignUpDocument,
    "\n  mutation SignOut {\n    signOut\n  }\n": types.SignOutDocument,
    "\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n": types.RequestPasswordResetDocument,
    "\n  mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!) {\n    resetPassword(email: $email, otp: $otp, newPassword: $newPassword)\n  }\n": types.ResetPasswordDocument,
    "\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n": types.MeDocument,
    "\n  query DashboardStats {\n    providers {\n      id\n      name\n      type\n      status\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n      }\n    }\n    bandwidthUsage {\n      direction\n      totalBytes\n      periodStart\n      periodEnd\n    }\n    myUploadBatches {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n    myTransferJobs {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n  }\n": types.DashboardStatsDocument,
    "\n  mutation ConnectProvider($input: ConnectProviderInput!) {\n    connectProvider(input: $input) {\n      id\n      name\n      type\n      status\n    }\n  }\n": types.ConnectProviderDocument,
    "\n  mutation DisconnectProvider($id: UUID!) {\n    disconnectProvider(id: $id)\n  }\n": types.DisconnectProviderDocument,
    "\n  mutation InitiateOAuth($oauthAppID: UUID!, $providerName: String!) {\n    initiateOAuth(oauthAppID: $oauthAppID, providerName: $providerName)\n  }\n": types.InitiateOAuthDocument,
    "\n  mutation SaveOAuthApp($input: SaveOAuthAppInput!) {\n    saveOAuthApp(input: $input) {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n": types.SaveOAuthAppDocument,
    "\n  mutation ValidateProvider($id: UUID!) {\n    validateProvider(id: $id) {\n      ok\n      error\n    }\n  }\n": types.ValidateProviderDocument,
    "\n  query OAuthApps {\n    oauthApps {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n": types.OAuthAppsDocument,
    "\n  query Providers {\n    providers {\n      id\n      name\n      type\n      status\n      createdAt\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n        syncedAt\n      }\n    }\n  }\n": types.ProvidersDocument,
    "\n  query AvailableProviders {\n    availableProviders {\n      type\n      label\n      description\n      authType\n      fields {\n        name\n        label\n        type\n        required\n        placeholder\n        description\n        secret\n      }\n    }\n  }\n": types.AvailableProvidersDocument,
    "\n  mutation SwitchWorkspace($workspaceID: UUID!) {\n    switchWorkspace(workspaceID: $workspaceID) {\n      accessToken\n    }\n  }\n": types.SwitchWorkspaceDocument,
    "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n      name\n      slug\n    }\n  }\n": types.CreateWorkspaceDocument,
    "\n  query MyWorkspaces {\n    myWorkspaces {\n      id\n      name\n      slug\n    }\n  }\n": types.MyWorkspacesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SignIn($input: SignInInput!) {\n    signIn(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SignUp($input: SignUpInput!) {\n    signUp(input: $input) {\n      accessToken\n      refreshToken\n      user {\n        id\n        email\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SignOut {\n    signOut\n  }\n"): (typeof documents)["\n  mutation SignOut {\n    signOut\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n"): (typeof documents)["\n  mutation RequestPasswordReset($email: String!) {\n    requestPasswordReset(email: $email)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!) {\n    resetPassword(email: $email, otp: $otp, newPassword: $newPassword)\n  }\n"): (typeof documents)["\n  mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!) {\n    resetPassword(email: $email, otp: $otp, newPassword: $newPassword)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      id\n      email\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardStats {\n    providers {\n      id\n      name\n      type\n      status\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n      }\n    }\n    bandwidthUsage {\n      direction\n      totalBytes\n      periodStart\n      periodEnd\n    }\n    myUploadBatches {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n    myTransferJobs {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  query DashboardStats {\n    providers {\n      id\n      name\n      type\n      status\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n      }\n    }\n    bandwidthUsage {\n      direction\n      totalBytes\n      periodStart\n      periodEnd\n    }\n    myUploadBatches {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n    myTransferJobs {\n      id\n      status\n      totalFiles\n      completedFiles\n      failedFiles\n      totalBytes\n      transferredBytes\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ConnectProvider($input: ConnectProviderInput!) {\n    connectProvider(input: $input) {\n      id\n      name\n      type\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation ConnectProvider($input: ConnectProviderInput!) {\n    connectProvider(input: $input) {\n      id\n      name\n      type\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DisconnectProvider($id: UUID!) {\n    disconnectProvider(id: $id)\n  }\n"): (typeof documents)["\n  mutation DisconnectProvider($id: UUID!) {\n    disconnectProvider(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InitiateOAuth($oauthAppID: UUID!, $providerName: String!) {\n    initiateOAuth(oauthAppID: $oauthAppID, providerName: $providerName)\n  }\n"): (typeof documents)["\n  mutation InitiateOAuth($oauthAppID: UUID!, $providerName: String!) {\n    initiateOAuth(oauthAppID: $oauthAppID, providerName: $providerName)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SaveOAuthApp($input: SaveOAuthAppInput!) {\n    saveOAuthApp(input: $input) {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n"): (typeof documents)["\n  mutation SaveOAuthApp($input: SaveOAuthAppInput!) {\n    saveOAuthApp(input: $input) {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ValidateProvider($id: UUID!) {\n    validateProvider(id: $id) {\n      ok\n      error\n    }\n  }\n"): (typeof documents)["\n  mutation ValidateProvider($id: UUID!) {\n    validateProvider(id: $id) {\n      ok\n      error\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OAuthApps {\n    oauthApps {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n"): (typeof documents)["\n  query OAuthApps {\n    oauthApps {\n      id\n      providerType\n      clientID\n      alias\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Providers {\n    providers {\n      id\n      name\n      type\n      status\n      createdAt\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n        syncedAt\n      }\n    }\n  }\n"): (typeof documents)["\n  query Providers {\n    providers {\n      id\n      name\n      type\n      status\n      createdAt\n      quota {\n        totalBytes\n        usedBytes\n        freeBytes\n        syncedAt\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AvailableProviders {\n    availableProviders {\n      type\n      label\n      description\n      authType\n      fields {\n        name\n        label\n        type\n        required\n        placeholder\n        description\n        secret\n      }\n    }\n  }\n"): (typeof documents)["\n  query AvailableProviders {\n    availableProviders {\n      type\n      label\n      description\n      authType\n      fields {\n        name\n        label\n        type\n        required\n        placeholder\n        description\n        secret\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SwitchWorkspace($workspaceID: UUID!) {\n    switchWorkspace(workspaceID: $workspaceID) {\n      accessToken\n    }\n  }\n"): (typeof documents)["\n  mutation SwitchWorkspace($workspaceID: UUID!) {\n    switchWorkspace(workspaceID: $workspaceID) {\n      accessToken\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkspace($input: CreateWorkspaceInput!) {\n    createWorkspace(input: $input) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MyWorkspaces {\n    myWorkspaces {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  query MyWorkspaces {\n    myWorkspaces {\n      id\n      name\n      slug\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;