/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

export enum AuthType {
  ApiKey = 'API_KEY',
  Basic = 'BASIC',
  None = 'NONE',
  Oauth2 = 'OAUTH2'
}

export type AuthUrlResponse = {
  __typename?: 'AuthUrlResponse';
  url: Scalars['String']['output'];
};

export type AuthorizeApiKeyInput = {
  credentials: Scalars['JSON']['input'];
  label: Scalars['String']['input'];
  type: ProviderType;
};

export type ConfigField = {
  __typename?: 'ConfigField';
  default?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ConfigurationSchema = {
  __typename?: 'ConfigurationSchema';
  fields: Array<ConfigField>;
  required: Array<Scalars['String']['output']>;
};

export type CreateWorkspaceInput = {
  name: Scalars['String']['input'];
};

export type File = {
  __typename?: 'File';
  children: Array<File>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  isFolder: Scalars['Boolean']['output'];
  isStarred: Scalars['Boolean']['output'];
  mimeType?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parent?: Maybe<File>;
  parentId?: Maybe<Scalars['String']['output']>;
  parentPath: Scalars['String']['output'];
  path: Scalars['String']['output'];
  provider?: Maybe<Provider>;
  providerId?: Maybe<Scalars['String']['output']>;
  referenceId?: Maybe<Scalars['String']['output']>;
  size?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  workspace?: Maybe<Workspace>;
  workspaceId?: Maybe<Scalars['String']['output']>;
};

export type ForgotPasswordResetInput = {
  code: Scalars['Float']['input'];
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ForgotPasswordResponse = {
  __typename?: 'ForgotPasswordResponse';
  ok: Scalars['Boolean']['output'];
};

export type ForgotPasswordSendCodeInput = {
  email: Scalars['String']['input'];
};

export type ForgotPasswordVerifyCodeInput = {
  code: Scalars['Float']['input'];
  email: Scalars['String']['input'];
};

export type GetAuthUrlInput = {
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  type: ProviderType;
};

export type HandleOAuthCallbackInput = {
  code: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type LoginResponse = {
  __typename?: 'LoginResponse';
  accessToken: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  authorizeApiKey: Provider;
  createWorkspace: Workspace;
  deleteWorkspace: WorkspaceResponse;
  forgotPasswordReset: ForgotPasswordResponse;
  forgotPasswordSendCode: ForgotPasswordResponse;
  forgotPasswordVerifyCode: VerifyCodeResponse;
  getAuthUrl: AuthUrlResponse;
  handleOAuthCallback: Provider;
  login: LoginResponse;
  register: RegisterResponse;
  updateProvider: Provider;
  updateProviderMetadata: Provider;
  updateWorkspace: WorkspaceResponse;
};


export type MutationAuthorizeApiKeyArgs = {
  input: AuthorizeApiKeyInput;
};


export type MutationCreateWorkspaceArgs = {
  input: CreateWorkspaceInput;
};


export type MutationForgotPasswordResetArgs = {
  input: ForgotPasswordResetInput;
};


export type MutationForgotPasswordSendCodeArgs = {
  input: ForgotPasswordSendCodeInput;
};


export type MutationForgotPasswordVerifyCodeArgs = {
  input: ForgotPasswordVerifyCodeInput;
};


export type MutationGetAuthUrlArgs = {
  input: GetAuthUrlInput;
};


export type MutationHandleOAuthCallbackArgs = {
  input: HandleOAuthCallbackInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationUpdateProviderArgs = {
  input: UpdateProviderInput;
};


export type MutationUpdateProviderMetadataArgs = {
  input: UpdateProviderMetadataInput;
};


export type MutationUpdateWorkspaceArgs = {
  input: UpdateWorkspaceInput;
};

export type PingResponse = {
  __typename?: 'PingResponse';
  startedAt: Scalars['DateTime']['output'];
  time: Scalars['DateTime']['output'];
};

export type Provider = {
  __typename?: 'Provider';
  authType: AuthType;
  createdAt: Scalars['DateTime']['output'];
  credentials: Scalars['JSON']['output'];
  files: Array<File>;
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  metadata?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  type: ProviderType;
  updatedAt: Scalars['DateTime']['output'];
  workspace: Workspace;
  workspaceId: Scalars['String']['output'];
};

export enum ProviderCapability {
  Delete = 'DELETE',
  List = 'LIST',
  Read = 'READ',
  Search = 'SEARCH',
  Share = 'SHARE',
  Versions = 'VERSIONS',
  Write = 'WRITE'
}

export type ProviderMetadata = {
  __typename?: 'ProviderMetadata';
  authType: AuthType;
  capabilities: Array<ProviderCapability>;
  configSchema: ConfigurationSchema;
  description: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  type: ProviderType;
};

export enum ProviderType {
  AmazonS3 = 'AMAZON_S3',
  Dropbox = 'DROPBOX',
  GoogleDrive = 'GOOGLE_DRIVE',
  Local = 'LOCAL',
  Onedrive = 'ONEDRIVE',
  Telegram = 'TELEGRAM'
}

export type Query = {
  __typename?: 'Query';
  availableProviders: Array<ProviderMetadata>;
  connectedProviders: Array<Provider>;
  currentWorkspace?: Maybe<Workspace>;
  me: User;
  ping: PingResponse;
  user: User;
  version: Scalars['String']['output'];
  workspace?: Maybe<Workspace>;
  workspaceStats: Array<WorkspaceStat>;
  workspaces: Array<Workspace>;
};


export type QueryUserArgs = {
  id: Scalars['String']['input'];
};


export type QueryWorkspaceArgs = {
  id: Scalars['String']['input'];
};

export type RegisterInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type RegisterResponse = {
  __typename?: 'RegisterResponse';
  ok: Scalars['Boolean']['output'];
};

export type UpdateProviderInput = {
  id: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProviderMetadataInput = {
  id: Scalars['String']['input'];
  metadata: Scalars['String']['input'];
};

export type UpdateWorkspaceInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  password: Scalars['String']['output'];
  role: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  workspaces: Array<Workspace>;
};

export type VerifyCodeResponse = {
  __typename?: 'VerifyCodeResponse';
  ok: Scalars['Boolean']['output'];
};

export type Workspace = {
  __typename?: 'Workspace';
  createdAt: Scalars['DateTime']['output'];
  files: Array<File>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  owner: User;
  ownerId: Scalars['String']['output'];
  providers: Array<Provider>;
  updatedAt: Scalars['DateTime']['output'];
};

export type WorkspaceResponse = {
  __typename?: 'WorkspaceResponse';
  ok: Scalars['Boolean']['output'];
};

export type WorkspaceStat = {
  __typename?: 'WorkspaceStat';
  count: Scalars['Float']['output'];
  size: Scalars['Float']['output'];
  title: Scalars['String']['output'];
};

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'RegisterResponse', ok: boolean } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'LoginResponse', accessToken: string } };

export type ForgotPasswordSendCodeMutationVariables = Exact<{
  input: ForgotPasswordSendCodeInput;
}>;


export type ForgotPasswordSendCodeMutation = { __typename?: 'Mutation', forgotPasswordSendCode: { __typename?: 'ForgotPasswordResponse', ok: boolean } };

export type ForgotPasswordVerifyCodeMutationVariables = Exact<{
  input: ForgotPasswordVerifyCodeInput;
}>;


export type ForgotPasswordVerifyCodeMutation = { __typename?: 'Mutation', forgotPasswordVerifyCode: { __typename?: 'VerifyCodeResponse', ok: boolean } };

export type ForgotPasswordResetMutationVariables = Exact<{
  input: ForgotPasswordResetInput;
}>;


export type ForgotPasswordResetMutation = { __typename?: 'Mutation', forgotPasswordReset: { __typename?: 'ForgotPasswordResponse', ok: boolean } };

export type GetAuthUrlMutationVariables = Exact<{
  input: GetAuthUrlInput;
}>;


export type GetAuthUrlMutation = { __typename?: 'Mutation', getAuthUrl: { __typename?: 'AuthUrlResponse', url: string } };

export type AuthorizeApiKeyMutationVariables = Exact<{
  input: AuthorizeApiKeyInput;
}>;


export type AuthorizeApiKeyMutation = { __typename?: 'Mutation', authorizeApiKey: { __typename?: 'Provider', id: string } };

export type HandleOAuthCallbackMutationVariables = Exact<{
  input: HandleOAuthCallbackInput;
}>;


export type HandleOAuthCallbackMutation = { __typename?: 'Mutation', handleOAuthCallback: { __typename?: 'Provider', id: string } };

export type CreateWorkspaceMutationVariables = Exact<{
  input: CreateWorkspaceInput;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: { __typename?: 'Workspace', id: string } };

export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeQuery = { __typename?: 'Query', me: { __typename?: 'User', name: string, email: string } };

export type GetAvailableProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAvailableProvidersQuery = { __typename?: 'Query', availableProviders: Array<{ __typename?: 'ProviderMetadata', displayName: string, authType: AuthType, type: ProviderType, configSchema: { __typename?: 'ConfigurationSchema', required: Array<string>, fields: Array<{ __typename?: 'ConfigField', id: string, type: string, label: string, description?: string | null, default?: string | null }> } }> };

export type GetConnectedProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetConnectedProvidersQuery = { __typename?: 'Query', connectedProviders: Array<{ __typename?: 'Provider', id: string, name: string, type: ProviderType, authType: AuthType, metadata?: string | null, createdAt: any }> };

export type GetVersionQueryVariables = Exact<{ [key: string]: never; }>;


export type GetVersionQuery = { __typename?: 'Query', version: string };

export type PingQueryVariables = Exact<{ [key: string]: never; }>;


export type PingQuery = { __typename?: 'Query', ping: { __typename?: 'PingResponse', time: any, startedAt: any } };

export type GetCurrentWorkspaceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentWorkspaceQuery = { __typename?: 'Query', currentWorkspace?: { __typename?: 'Workspace', id: string } | null };

export type GetWorkspacesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetWorkspacesQuery = { __typename?: 'Query', workspaces: Array<{ __typename?: 'Workspace', id: string, name: string, createdAt: any }> };

export type GetWorkspaceStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetWorkspaceStatsQuery = { __typename?: 'Query', workspaceStats: Array<{ __typename?: 'WorkspaceStat', title: string, count: number, size: number }> };


export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const ForgotPasswordSendCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForgotPasswordSendCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ForgotPasswordSendCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forgotPasswordSendCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}}]}}]}}]} as unknown as DocumentNode<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>;
export const ForgotPasswordVerifyCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForgotPasswordVerifyCode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ForgotPasswordVerifyCodeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forgotPasswordVerifyCode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}}]}}]}}]} as unknown as DocumentNode<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>;
export const ForgotPasswordResetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForgotPasswordReset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ForgotPasswordResetInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forgotPasswordReset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}}]}}]}}]} as unknown as DocumentNode<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>;
export const GetAuthUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GetAuthUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GetAuthUrlInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAuthUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]} as unknown as DocumentNode<GetAuthUrlMutation, GetAuthUrlMutationVariables>;
export const AuthorizeApiKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AuthorizeApiKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AuthorizeApiKeyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"authorizeApiKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<AuthorizeApiKeyMutation, AuthorizeApiKeyMutationVariables>;
export const HandleOAuthCallbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"HandleOAuthCallback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HandleOAuthCallbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"handleOAuthCallback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<HandleOAuthCallbackMutation, HandleOAuthCallbackMutationVariables>;
export const CreateWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWorkspaceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const GetMeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<GetMeQuery, GetMeQueryVariables>;
export const GetAvailableProvidersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAvailableProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"authType"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"configSchema"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"default"}}]}},{"kind":"Field","name":{"kind":"Name","value":"required"}}]}}]}}]}}]} as unknown as DocumentNode<GetAvailableProvidersQuery, GetAvailableProvidersQueryVariables>;
export const GetConnectedProvidersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetConnectedProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"connectedProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authType"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetConnectedProvidersQuery, GetConnectedProvidersQueryVariables>;
export const GetVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetVersion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]} as unknown as DocumentNode<GetVersionQuery, GetVersionQueryVariables>;
export const PingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Ping"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ping"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"time"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}}]}}]}}]} as unknown as DocumentNode<PingQuery, PingQueryVariables>;
export const GetCurrentWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCurrentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentWorkspace"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<GetCurrentWorkspaceQuery, GetCurrentWorkspaceQueryVariables>;
export const GetWorkspacesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workspaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GetWorkspacesQuery, GetWorkspacesQueryVariables>;
export const GetWorkspaceStatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWorkspaceStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"workspaceStats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]}}]} as unknown as DocumentNode<GetWorkspaceStatsQuery, GetWorkspaceStatsQueryVariables>;