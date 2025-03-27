import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as React from 'react';
import * as ApolloReactComponents from '@apollo/client/react/components';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
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


export const RegisterDocument = gql`
    mutation Register($input: RegisterInput!) {
  register(input: $input) {
    ok
  }
}
    `;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutation, RegisterMutationVariables>;
export type RegisterComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<RegisterMutation, RegisterMutationVariables>, 'mutation'>;

    export const RegisterComponent = (props: RegisterComponentProps) => (
      <ApolloReactComponents.Mutation<RegisterMutation, RegisterMutationVariables> mutation={RegisterDocument} {...props} />
    );
    

/**
 * __useRegisterMutation__
 *
 * To run a mutation, you first call `useRegisterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMutation, { data, loading, error }] = useRegisterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterMutation(baseOptions?: Apollo.MutationHookOptions<RegisterMutation, RegisterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, options);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const LoginDocument = gql`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;
export type LoginComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<LoginMutation, LoginMutationVariables>, 'mutation'>;

    export const LoginComponent = (props: LoginComponentProps) => (
      <ApolloReactComponents.Mutation<LoginMutation, LoginMutationVariables> mutation={LoginDocument} {...props} />
    );
    

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const ForgotPasswordSendCodeDocument = gql`
    mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {
  forgotPasswordSendCode(input: $input) {
    ok
  }
}
    `;
export type ForgotPasswordSendCodeMutationFn = Apollo.MutationFunction<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>;
export type ForgotPasswordSendCodeComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>, 'mutation'>;

    export const ForgotPasswordSendCodeComponent = (props: ForgotPasswordSendCodeComponentProps) => (
      <ApolloReactComponents.Mutation<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables> mutation={ForgotPasswordSendCodeDocument} {...props} />
    );
    

/**
 * __useForgotPasswordSendCodeMutation__
 *
 * To run a mutation, you first call `useForgotPasswordSendCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useForgotPasswordSendCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [forgotPasswordSendCodeMutation, { data, loading, error }] = useForgotPasswordSendCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useForgotPasswordSendCodeMutation(baseOptions?: Apollo.MutationHookOptions<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>(ForgotPasswordSendCodeDocument, options);
      }
export type ForgotPasswordSendCodeMutationHookResult = ReturnType<typeof useForgotPasswordSendCodeMutation>;
export type ForgotPasswordSendCodeMutationResult = Apollo.MutationResult<ForgotPasswordSendCodeMutation>;
export type ForgotPasswordSendCodeMutationOptions = Apollo.BaseMutationOptions<ForgotPasswordSendCodeMutation, ForgotPasswordSendCodeMutationVariables>;
export const ForgotPasswordVerifyCodeDocument = gql`
    mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {
  forgotPasswordVerifyCode(input: $input) {
    ok
  }
}
    `;
export type ForgotPasswordVerifyCodeMutationFn = Apollo.MutationFunction<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>;
export type ForgotPasswordVerifyCodeComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>, 'mutation'>;

    export const ForgotPasswordVerifyCodeComponent = (props: ForgotPasswordVerifyCodeComponentProps) => (
      <ApolloReactComponents.Mutation<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables> mutation={ForgotPasswordVerifyCodeDocument} {...props} />
    );
    

/**
 * __useForgotPasswordVerifyCodeMutation__
 *
 * To run a mutation, you first call `useForgotPasswordVerifyCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useForgotPasswordVerifyCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [forgotPasswordVerifyCodeMutation, { data, loading, error }] = useForgotPasswordVerifyCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useForgotPasswordVerifyCodeMutation(baseOptions?: Apollo.MutationHookOptions<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>(ForgotPasswordVerifyCodeDocument, options);
      }
export type ForgotPasswordVerifyCodeMutationHookResult = ReturnType<typeof useForgotPasswordVerifyCodeMutation>;
export type ForgotPasswordVerifyCodeMutationResult = Apollo.MutationResult<ForgotPasswordVerifyCodeMutation>;
export type ForgotPasswordVerifyCodeMutationOptions = Apollo.BaseMutationOptions<ForgotPasswordVerifyCodeMutation, ForgotPasswordVerifyCodeMutationVariables>;
export const ForgotPasswordResetDocument = gql`
    mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {
  forgotPasswordReset(input: $input) {
    ok
  }
}
    `;
export type ForgotPasswordResetMutationFn = Apollo.MutationFunction<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>;
export type ForgotPasswordResetComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>, 'mutation'>;

    export const ForgotPasswordResetComponent = (props: ForgotPasswordResetComponentProps) => (
      <ApolloReactComponents.Mutation<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables> mutation={ForgotPasswordResetDocument} {...props} />
    );
    

/**
 * __useForgotPasswordResetMutation__
 *
 * To run a mutation, you first call `useForgotPasswordResetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useForgotPasswordResetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [forgotPasswordResetMutation, { data, loading, error }] = useForgotPasswordResetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useForgotPasswordResetMutation(baseOptions?: Apollo.MutationHookOptions<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>(ForgotPasswordResetDocument, options);
      }
export type ForgotPasswordResetMutationHookResult = ReturnType<typeof useForgotPasswordResetMutation>;
export type ForgotPasswordResetMutationResult = Apollo.MutationResult<ForgotPasswordResetMutation>;
export type ForgotPasswordResetMutationOptions = Apollo.BaseMutationOptions<ForgotPasswordResetMutation, ForgotPasswordResetMutationVariables>;
export const CreateWorkspaceDocument = gql`
    mutation CreateWorkspace($input: CreateWorkspaceInput!) {
  createWorkspace(input: $input) {
    id
  }
}
    `;
export type CreateWorkspaceMutationFn = Apollo.MutationFunction<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export type CreateWorkspaceComponentProps = Omit<ApolloReactComponents.MutationComponentOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>, 'mutation'>;

    export const CreateWorkspaceComponent = (props: CreateWorkspaceComponentProps) => (
      <ApolloReactComponents.Mutation<CreateWorkspaceMutation, CreateWorkspaceMutationVariables> mutation={CreateWorkspaceDocument} {...props} />
    );
    

/**
 * __useCreateWorkspaceMutation__
 *
 * To run a mutation, you first call `useCreateWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWorkspaceMutation, { data, loading, error }] = useCreateWorkspaceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateWorkspaceMutation(baseOptions?: Apollo.MutationHookOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>(CreateWorkspaceDocument, options);
      }
export type CreateWorkspaceMutationHookResult = ReturnType<typeof useCreateWorkspaceMutation>;
export type CreateWorkspaceMutationResult = Apollo.MutationResult<CreateWorkspaceMutation>;
export type CreateWorkspaceMutationOptions = Apollo.BaseMutationOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const GetMeDocument = gql`
    query GetMe {
  me {
    name
  }
}
    `;
export type GetMeComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GetMeQuery, GetMeQueryVariables>, 'query'>;

    export const GetMeComponent = (props: GetMeComponentProps) => (
      <ApolloReactComponents.Query<GetMeQuery, GetMeQueryVariables> query={GetMeDocument} {...props} />
    );
    

/**
 * __useGetMeQuery__
 *
 * To run a query within a React component, call `useGetMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMeQuery(baseOptions?: Apollo.QueryHookOptions<GetMeQuery, GetMeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMeQuery, GetMeQueryVariables>(GetMeDocument, options);
      }
export function useGetMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMeQuery, GetMeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMeQuery, GetMeQueryVariables>(GetMeDocument, options);
        }
export function useGetMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMeQuery, GetMeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMeQuery, GetMeQueryVariables>(GetMeDocument, options);
        }
export type GetMeQueryHookResult = ReturnType<typeof useGetMeQuery>;
export type GetMeLazyQueryHookResult = ReturnType<typeof useGetMeLazyQuery>;
export type GetMeSuspenseQueryHookResult = ReturnType<typeof useGetMeSuspenseQuery>;
export type GetMeQueryResult = Apollo.QueryResult<GetMeQuery, GetMeQueryVariables>;