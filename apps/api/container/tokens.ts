/**
 * Injection tokens for the service container.
 * Using symbols ensures uniqueness and prevents string collisions.
 */
export const Tokens = {
	// Infrastructure
	Database: Symbol("Database"),
	PubSub: Symbol("PubSub"),

	// Services
	ActivityService: Symbol("ActivityService"),
	AuthService: Symbol("AuthService"),
	FileService: Symbol("FileService"),
	FolderService: Symbol("FolderService"),
	ProviderService: Symbol("ProviderService"),
	UploadSessionManager: Symbol("UploadSessionManager"),
	UserService: Symbol("UserService"),
	VaultService: Symbol("VaultService"),
} as const;
