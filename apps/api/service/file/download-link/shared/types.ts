export type FileDownloadLinkRow = {
	id: string;
	token: string;
	fileId: string;
	workspaceId: string;
	maxDownloads: number;
	downloadCount: number;
	expiresAt: Date;
	lastAccessedAt: Date | null;
	revokedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type ActiveFileDownloadLinkRow = {
	id: string;
	token: string;
	fileId: string;
	maxDownloads: number;
	downloadCount: number;
	expiresAt: Date;
	lastAccessedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type FileDownloadLinkContext = {
	downloadLinkId: string;
	fileId: string;
	workspaceId: string;
	token: string;
	maxDownloads: number;
	downloadCount: number;
	expiresAt: Date;
	lastAccessedAt: Date | null;
};
