/* eslint-disable */
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
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
};

export enum AuthType {
  ApiKey = 'API_KEY',
  Basic = 'BASIC',
  None = 'NONE',
  Oauth2 = 'OAUTH2'
}

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
  createWorkspace: Workspace;
  deleteWorkspace: WorkspaceResponse;
  forgotPasswordReset: ForgotPasswordResponse;
  forgotPasswordSendCode: ForgotPasswordResponse;
  forgotPasswordVerifyCode: VerifyCodeResponse;
  login: LoginResponse;
  register: RegisterResponse;
  updateWorkspace: WorkspaceResponse;
};


export type MutationCreateWorkspaceArgs = {
  input: CreateWorkspaceInput;
};


export type MutationDeleteWorkspaceArgs = {
  id: Scalars['String']['input'];
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


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationUpdateWorkspaceArgs = {
  input: UpdateWorkspaceInput;
};

export type Provider = {
  __typename?: 'Provider';
  authType: AuthType;
  createdAt: Scalars['DateTime']['output'];
  credentials: Scalars['String']['output'];
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
  me: User;
  user: User;
  workspace?: Maybe<Workspace>;
  workspaceStats: Array<WorkspaceStat>;
  workspaceWithProviders?: Maybe<Workspace>;
  workspaces: Array<Workspace>;
};


export type QueryUserArgs = {
  id: Scalars['String']['input'];
};


export type QueryWorkspaceArgs = {
  id: Scalars['String']['input'];
};


export type QueryWorkspaceStatsArgs = {
  id: Scalars['String']['input'];
};


export type QueryWorkspaceWithProvidersArgs = {
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

export type UpdateWorkspaceInput = {
  id: Scalars['String']['input'];
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

export type CreateWorkspaceMutationVariables = Exact<{
  input: CreateWorkspaceInput;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: { __typename?: 'Workspace', id: string } };

export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeQuery = { __typename?: 'Query', me: { __typename?: 'User', name: string } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: DocumentTypeDecoration<TResult, TVariables>['__apiType'];
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const RegisterDocument = new TypedDocumentString(`
    mutation Register($input: RegisterInput!) {
  register(input: $input) {
    ok
  }
}
    `) as unknown as TypedDocumentString<RegisterMutation, RegisterMutationVariables>;
export const LoginDocument = new TypedDocumentString(`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
  }
}
    `) as unknown as TypedDocumentString<LoginMutation, LoginMutationVariables>;
export const ForgotPasswordSendCodeDocument = new TypedDocumentString(`
    mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {
  forgotPasswordSendCode(input: $input) {
    ok
  }
}
    `) as unknown as TypedDocumentString<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>;
export const ForgotPasswordVerifyCodeDocument = new TypedDocumentString(`
    mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {
  forgotPasswordVerifyCode(input: $input) {
    ok
  }
}
    `) as unknown as TypedDocumentString<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>;
export const ForgotPasswordResetDocument = new TypedDocumentString(`
    mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {
  forgotPasswordReset(input: $input) {
    ok
  }
}
    `) as unknown as TypedDocumentString<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>;
export const CreateWorkspaceDocument = new TypedDocumentString(`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
  createWorkspace(input: $input) {
    id
  }
}
    `) as unknown as TypedDocumentString<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const GetMeDocument = new TypedDocumentString(`
    query GetMe {
  me {
    name
  }
}
    `) as unknown as TypedDocumentString<GetMeQuery, GetMeQueryVariables>;