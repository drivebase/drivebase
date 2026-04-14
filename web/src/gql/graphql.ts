/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = {
	[K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
	[SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
	[SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
	T extends { [key: string]: unknown },
	K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
	| T
	| {
			[P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
	  };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
	ID: { input: string; output: string };
	String: { input: string; output: string };
	Boolean: { input: boolean; output: boolean };
	Int: { input: number; output: number };
	Float: { input: number; output: number };
	Time: { input: any; output: any };
	UUID: { input: any; output: any };
};

export type ApiToken = {
	__typename?: "ApiToken";
	createdAt: Scalars["Time"]["output"];
	displayToken: Scalars["String"]["output"];
	expiresAt?: Maybe<Scalars["Time"]["output"]>;
	id: Scalars["UUID"]["output"];
	lastUsedAt?: Maybe<Scalars["Time"]["output"]>;
	name: Scalars["String"]["output"];
	providerScopes?: Maybe<Array<ApiTokenProviderScope>>;
	scopes: Array<Scalars["String"]["output"]>;
};

export type ApiTokenProviderScope = {
	__typename?: "ApiTokenProviderScope";
	folderIDs: Array<Scalars["UUID"]["output"]>;
	providerID: Scalars["UUID"]["output"];
};

export type ApiTokenProviderScopeInput = {
	folderIDs?: InputMaybe<Array<Scalars["UUID"]["input"]>>;
	providerID: Scalars["UUID"]["input"];
};

export type AuthPayload = {
	__typename?: "AuthPayload";
	accessToken: Scalars["String"]["output"];
	refreshToken: Scalars["String"]["output"];
	user: User;
};

export enum AuthType {
	ApiKey = "api_key",
	Credential = "credential",
	None = "none",
	Oauth = "oauth",
}

export type BandwidthSummary = {
	__typename?: "BandwidthSummary";
	direction: Scalars["String"]["output"];
	periodEnd: Scalars["Time"]["output"];
	periodStart: Scalars["Time"]["output"];
	providerID: Scalars["UUID"]["output"];
	totalBytes: Scalars["Int"]["output"];
};

export enum ConflictStrategy {
	Overwrite = "OVERWRITE",
	Skip = "SKIP",
}

export type ConnectProviderInput = {
	credentials: Scalars["String"]["input"];
	name: Scalars["String"]["input"];
	type: ProviderType;
};

export type CreateApiTokenInput = {
	expiresAt?: InputMaybe<Scalars["Time"]["input"]>;
	name: Scalars["String"]["input"];
	providerScopes?: InputMaybe<Array<ApiTokenProviderScopeInput>>;
	scopes: Array<Scalars["String"]["input"]>;
};

export type CreateApiTokenPayload = {
	__typename?: "CreateApiTokenPayload";
	rawToken: Scalars["String"]["output"];
	token: ApiToken;
};

export type CreateFolderInput = {
	name: Scalars["String"]["input"];
	parentRemoteID?: InputMaybe<Scalars["String"]["input"]>;
	providerID: Scalars["UUID"]["input"];
};

export type CreateSharedLinkInput = {
	expiresAt?: InputMaybe<Scalars["Time"]["input"]>;
	fileNodeID: Scalars["UUID"]["input"];
	maxUploads?: InputMaybe<Scalars["Int"]["input"]>;
	password?: InputMaybe<Scalars["String"]["input"]>;
	permissions?: InputMaybe<SharedLinkPermissionsInput>;
};

export type CreateWorkspaceInput = {
	name: Scalars["String"]["input"];
	slug: Scalars["String"]["input"];
};

export type DeleteFileInput = {
	fileNodeID: Scalars["UUID"]["input"];
	providerID: Scalars["UUID"]["input"];
};

export type FileNode = {
	__typename?: "FileNode";
	checksum?: Maybe<Scalars["String"]["output"]>;
	createdAt: Scalars["Time"]["output"];
	id: Scalars["UUID"]["output"];
	isDir: Scalars["Boolean"]["output"];
	mimeType?: Maybe<Scalars["String"]["output"]>;
	name: Scalars["String"]["output"];
	parentID?: Maybe<Scalars["UUID"]["output"]>;
	providerID: Scalars["UUID"]["output"];
	remoteID: Scalars["String"]["output"];
	remoteModifiedAt?: Maybe<Scalars["Time"]["output"]>;
	size: Scalars["Int"]["output"];
	syncedAt: Scalars["Time"]["output"];
};

export type ListFilesInput = {
	pageSize?: InputMaybe<Scalars["Int"]["input"]>;
	pageToken?: InputMaybe<Scalars["String"]["input"]>;
	parentID?: InputMaybe<Scalars["UUID"]["input"]>;
	providerID: Scalars["UUID"]["input"];
};

export type ListFilesResult = {
	__typename?: "ListFilesResult";
	files: Array<FileNode>;
	nextPageToken?: Maybe<Scalars["String"]["output"]>;
};

export type MoveFileInput = {
	fileNodeID: Scalars["UUID"]["input"];
	newParentRemoteID: Scalars["String"]["input"];
	providerID: Scalars["UUID"]["input"];
};

export type Mutation = {
	__typename?: "Mutation";
	cancelTransferJob: Scalars["Boolean"]["output"];
	connectProvider: Provider;
	createApiToken: CreateApiTokenPayload;
	createFolder: FileNode;
	createSharedLink: SharedLink;
	createWorkspace: Workspace;
	deleteFile: Scalars["Boolean"]["output"];
	deleteOAuthApp: Scalars["Boolean"]["output"];
	deleteWorkspace: Scalars["Boolean"]["output"];
	disconnectProvider: Scalars["Boolean"]["output"];
	generateTempLink: Scalars["String"]["output"];
	initiateOAuth: Scalars["String"]["output"];
	inviteMember: WorkspaceMember;
	moveFile: FileNode;
	refreshProviderQuota: ProviderQuota;
	refreshToken: AuthPayload;
	removeMember: Scalars["Boolean"]["output"];
	renameFile: FileNode;
	revokeApiToken: Scalars["Boolean"]["output"];
	revokeSession: Scalars["Boolean"]["output"];
	revokeSharedLink: Scalars["Boolean"]["output"];
	saveOAuthApp: OAuthApp;
	signIn: AuthPayload;
	signOut: Scalars["Boolean"]["output"];
	signUp: AuthPayload;
	startFolderSync: TransferJob;
	switchWorkspace: SwitchWorkspacePayload;
	syncProvider: Scalars["Boolean"]["output"];
	updateMemberRole: WorkspaceMember;
	updateProvider: Provider;
	updateWorkspace: Workspace;
	validateProvider: ProviderValidationResult;
};

export type MutationCancelTransferJobArgs = {
	id: Scalars["UUID"]["input"];
};

export type MutationConnectProviderArgs = {
	input: ConnectProviderInput;
};

export type MutationCreateApiTokenArgs = {
	input: CreateApiTokenInput;
};

export type MutationCreateFolderArgs = {
	input: CreateFolderInput;
};

export type MutationCreateSharedLinkArgs = {
	input: CreateSharedLinkInput;
};

export type MutationCreateWorkspaceArgs = {
	input: CreateWorkspaceInput;
};

export type MutationDeleteFileArgs = {
	input: DeleteFileInput;
};

export type MutationDeleteOAuthAppArgs = {
	providerType: ProviderType;
};

export type MutationDeleteWorkspaceArgs = {
	id: Scalars["UUID"]["input"];
};

export type MutationDisconnectProviderArgs = {
	id: Scalars["UUID"]["input"];
};

export type MutationGenerateTempLinkArgs = {
	fileNodeID: Scalars["UUID"]["input"];
	ttlSeconds?: InputMaybe<Scalars["Int"]["input"]>;
};

export type MutationInitiateOAuthArgs = {
	providerName: Scalars["String"]["input"];
	providerType: ProviderType;
};

export type MutationInviteMemberArgs = {
	email: Scalars["String"]["input"];
	roleId: Scalars["UUID"]["input"];
};

export type MutationMoveFileArgs = {
	input: MoveFileInput;
};

export type MutationRefreshProviderQuotaArgs = {
	providerID: Scalars["UUID"]["input"];
};

export type MutationRefreshTokenArgs = {
	token: Scalars["String"]["input"];
};

export type MutationRemoveMemberArgs = {
	userId: Scalars["UUID"]["input"];
};

export type MutationRenameFileArgs = {
	input: RenameFileInput;
};

export type MutationRevokeApiTokenArgs = {
	id: Scalars["UUID"]["input"];
};

export type MutationRevokeSessionArgs = {
	sessionId: Scalars["UUID"]["input"];
};

export type MutationRevokeSharedLinkArgs = {
	id: Scalars["UUID"]["input"];
};

export type MutationSaveOAuthAppArgs = {
	input: SaveOAuthAppInput;
};

export type MutationSignInArgs = {
	input: SignInInput;
};

export type MutationSignUpArgs = {
	input: SignUpInput;
};

export type MutationStartFolderSyncArgs = {
	input: StartFolderSyncInput;
};

export type MutationSwitchWorkspaceArgs = {
	workspaceID: Scalars["UUID"]["input"];
};

export type MutationSyncProviderArgs = {
	providerID: Scalars["UUID"]["input"];
};

export type MutationUpdateMemberRoleArgs = {
	roleId: Scalars["UUID"]["input"];
	userId: Scalars["UUID"]["input"];
};

export type MutationUpdateProviderArgs = {
	id: Scalars["UUID"]["input"];
	input: UpdateProviderInput;
};

export type MutationUpdateWorkspaceArgs = {
	id: Scalars["UUID"]["input"];
	input: UpdateWorkspaceInput;
};

export type MutationValidateProviderArgs = {
	id: Scalars["UUID"]["input"];
};

export type OAuthApp = {
	__typename?: "OAuthApp";
	alias?: Maybe<Scalars["String"]["output"]>;
	clientID: Scalars["String"]["output"];
	createdAt: Scalars["Time"]["output"];
	providerType: ProviderType;
};

export type Provider = {
	__typename?: "Provider";
	authType: AuthType;
	createdAt: Scalars["Time"]["output"];
	id: Scalars["UUID"]["output"];
	name: Scalars["String"]["output"];
	quota?: Maybe<ProviderQuota>;
	status: ProviderStatus;
	type: ProviderType;
	workspaceId: Scalars["UUID"]["output"];
};

export type ProviderQuota = {
	__typename?: "ProviderQuota";
	extra?: Maybe<Scalars["String"]["output"]>;
	freeBytes: Scalars["Int"]["output"];
	planName?: Maybe<Scalars["String"]["output"]>;
	providerID: Scalars["UUID"]["output"];
	syncedAt: Scalars["Time"]["output"];
	totalBytes: Scalars["Int"]["output"];
	trashBytes: Scalars["Int"]["output"];
	usedBytes: Scalars["Int"]["output"];
};

export enum ProviderStatus {
	Active = "active",
	Disconnected = "disconnected",
	Error = "error",
}

export enum ProviderType {
	GoogleDrive = "GOOGLE_DRIVE",
	Local = "LOCAL",
	S3 = "S3",
}

export type ProviderValidationResult = {
	__typename?: "ProviderValidationResult";
	error?: Maybe<Scalars["String"]["output"]>;
	ok: Scalars["Boolean"]["output"];
};

export type Query = {
	__typename?: "Query";
	apiTokens: Array<ApiToken>;
	bandwidthUsage: Array<BandwidthSummary>;
	getFile: FileNode;
	listFiles: ListFilesResult;
	me: User;
	mySessions: Array<Session>;
	myTransferJobs: Array<TransferJob>;
	myUploadBatches: Array<UploadBatch>;
	myWorkspaces: Array<Workspace>;
	oauthApp?: Maybe<OAuthApp>;
	oauthApps: Array<OAuthApp>;
	provider: Provider;
	providerQuota?: Maybe<ProviderQuota>;
	providers: Array<Provider>;
	sharedLinkByToken?: Maybe<SharedLink>;
	sharedLinks: Array<SharedLink>;
	transferJob: TransferJob;
	uploadBatch: UploadBatch;
	workspace: Workspace;
	workspaceRoles: Array<Role>;
};

export type QueryBandwidthUsageArgs = {
	from?: InputMaybe<Scalars["Time"]["input"]>;
	providerID?: InputMaybe<Scalars["UUID"]["input"]>;
	to?: InputMaybe<Scalars["Time"]["input"]>;
};

export type QueryGetFileArgs = {
	fileNodeID: Scalars["UUID"]["input"];
	providerID: Scalars["UUID"]["input"];
};

export type QueryListFilesArgs = {
	input: ListFilesInput;
};

export type QueryOauthAppArgs = {
	providerType: ProviderType;
};

export type QueryProviderArgs = {
	id: Scalars["UUID"]["input"];
};

export type QueryProviderQuotaArgs = {
	providerID: Scalars["UUID"]["input"];
};

export type QuerySharedLinkByTokenArgs = {
	token: Scalars["String"]["input"];
};

export type QueryTransferJobArgs = {
	id: Scalars["UUID"]["input"];
};

export type QueryUploadBatchArgs = {
	id: Scalars["UUID"]["input"];
};

export type QueryWorkspaceArgs = {
	id: Scalars["UUID"]["input"];
};

export type RenameFileInput = {
	fileNodeID: Scalars["UUID"]["input"];
	newName: Scalars["String"]["input"];
	providerID: Scalars["UUID"]["input"];
};

export type Role = {
	__typename?: "Role";
	id: Scalars["UUID"]["output"];
	isSystem: Scalars["Boolean"]["output"];
	name: Scalars["String"]["output"];
};

export type SaveOAuthAppInput = {
	alias?: InputMaybe<Scalars["String"]["input"]>;
	clientID: Scalars["String"]["input"];
	clientSecret: Scalars["String"]["input"];
	providerType: ProviderType;
};

export type Session = {
	__typename?: "Session";
	createdAt: Scalars["Time"]["output"];
	expiresAt: Scalars["Time"]["output"];
	id: Scalars["UUID"]["output"];
	ipAddress?: Maybe<Scalars["String"]["output"]>;
	userAgent?: Maybe<Scalars["String"]["output"]>;
};

export type SharedLink = {
	__typename?: "SharedLink";
	active: Scalars["Boolean"]["output"];
	createdAt: Scalars["Time"]["output"];
	expiresAt?: Maybe<Scalars["Time"]["output"]>;
	fileNodeID: Scalars["UUID"]["output"];
	id: Scalars["UUID"]["output"];
	maxUploads?: Maybe<Scalars["Int"]["output"]>;
	permissions: SharedLinkPermissions;
	token: Scalars["String"]["output"];
	uploadCount: Scalars["Int"]["output"];
	workspaceID: Scalars["UUID"]["output"];
};

export type SharedLinkPermissions = {
	__typename?: "SharedLinkPermissions";
	copy: Scalars["Boolean"]["output"];
	delete: Scalars["Boolean"]["output"];
	mkdir: Scalars["Boolean"]["output"];
	move: Scalars["Boolean"]["output"];
	rename: Scalars["Boolean"]["output"];
	upload: Scalars["Boolean"]["output"];
};

export type SharedLinkPermissionsInput = {
	copy?: InputMaybe<Scalars["Boolean"]["input"]>;
	delete?: InputMaybe<Scalars["Boolean"]["input"]>;
	mkdir?: InputMaybe<Scalars["Boolean"]["input"]>;
	move?: InputMaybe<Scalars["Boolean"]["input"]>;
	rename?: InputMaybe<Scalars["Boolean"]["input"]>;
	upload?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type SignInInput = {
	email: Scalars["String"]["input"];
	password: Scalars["String"]["input"];
	workspaceSlug?: InputMaybe<Scalars["String"]["input"]>;
};

export type SignUpInput = {
	email: Scalars["String"]["input"];
	name: Scalars["String"]["input"];
	password: Scalars["String"]["input"];
};

export type StartFolderSyncInput = {
	conflictStrategy?: InputMaybe<ConflictStrategy>;
	destFolderRemoteID?: InputMaybe<Scalars["String"]["input"]>;
	destProviderID: Scalars["UUID"]["input"];
	sourceFolderRemoteID?: InputMaybe<Scalars["String"]["input"]>;
	sourceProviderID: Scalars["UUID"]["input"];
};

export type SwitchWorkspacePayload = {
	__typename?: "SwitchWorkspacePayload";
	accessToken: Scalars["String"]["output"];
};

export type TransferJob = {
	__typename?: "TransferJob";
	completedAt?: Maybe<Scalars["Time"]["output"]>;
	completedFiles: Scalars["Int"]["output"];
	conflictStrategy: Scalars["String"]["output"];
	createdAt: Scalars["Time"]["output"];
	destFolderRemoteID: Scalars["String"]["output"];
	destProviderID: Scalars["UUID"]["output"];
	errorMessage?: Maybe<Scalars["String"]["output"]>;
	failedFiles: Scalars["Int"]["output"];
	id: Scalars["UUID"]["output"];
	operation: Scalars["String"]["output"];
	sourceFolderRemoteID: Scalars["String"]["output"];
	sourceProviderID: Scalars["UUID"]["output"];
	status: Scalars["String"]["output"];
	totalBytes: Scalars["Int"]["output"];
	totalFiles: Scalars["Int"]["output"];
	transferredBytes: Scalars["Int"]["output"];
	workspaceID: Scalars["UUID"]["output"];
};

export type UpdateProviderInput = {
	name?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateWorkspaceInput = {
	name?: InputMaybe<Scalars["String"]["input"]>;
};

export type UploadBatch = {
	__typename?: "UploadBatch";
	completedAt?: Maybe<Scalars["Time"]["output"]>;
	completedFiles: Scalars["Int"]["output"];
	createdAt: Scalars["Time"]["output"];
	failedFiles: Scalars["Int"]["output"];
	id: Scalars["UUID"]["output"];
	parentRemoteID?: Maybe<Scalars["String"]["output"]>;
	providerID: Scalars["UUID"]["output"];
	status: Scalars["String"]["output"];
	totalBytes: Scalars["Int"]["output"];
	totalFiles: Scalars["Int"]["output"];
	transferredBytes: Scalars["Int"]["output"];
	workspaceID: Scalars["UUID"]["output"];
};

export type User = {
	__typename?: "User";
	createdAt: Scalars["Time"]["output"];
	email: Scalars["String"]["output"];
	id: Scalars["UUID"]["output"];
	name: Scalars["String"]["output"];
};

export type Workspace = {
	__typename?: "Workspace";
	createdAt: Scalars["Time"]["output"];
	id: Scalars["UUID"]["output"];
	members: Array<WorkspaceMember>;
	name: Scalars["String"]["output"];
	roles: Array<Role>;
	slug: Scalars["String"]["output"];
};

export type WorkspaceMember = {
	__typename?: "WorkspaceMember";
	id: Scalars["UUID"]["output"];
	joinedAt: Scalars["Time"]["output"];
	role: Role;
	user: User;
};
