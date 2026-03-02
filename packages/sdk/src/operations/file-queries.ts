const FILE_FIELDS = `
	id
	virtualPath
	name
	mimeType
	size
	hash
	remoteId
	providerId
	folderId
	uploadedBy
	isDeleted
	starred
	createdAt
	updatedAt
	lifecycle {
		state
		storageClass
		restoreRequestedAt
		restoreExpiresAt
		lastCheckedAt
	}
`;

export const GET_FILE = `
	query GetFile($id: ID!) {
		file(id: $id) {
			${FILE_FIELDS}
		}
	}
`;

export const LIST_FILES = `
	query ListFiles($folderId: ID, $limit: Int, $offset: Int) {
		files(folderId: $folderId, limit: $limit, offset: $offset) {
			files {
				${FILE_FIELDS}
			}
			total
			hasMore
		}
	}
`;

const FOLDER_FIELDS = `
	id
	virtualPath
	name
	remoteId
	providerId
	workspaceId
	parentId
	createdBy
	isDeleted
	starred
	createdAt
	updatedAt
`;

export const GET_CONTENTS = `
	query GetContents($folderId: ID, $providerIds: [ID!]) {
		contents(folderId: $folderId, providerIds: $providerIds) {
			files {
				${FILE_FIELDS}
			}
			folders {
				${FOLDER_FIELDS}
			}
			folder {
				${FOLDER_FIELDS}
			}
		}
	}
`;

export const SEARCH_FILES = `
	query SearchFiles($query: String!, $limit: Int) {
		searchFiles(query: $query, limit: $limit) {
			${FILE_FIELDS}
		}
	}
`;

export const SMART_SEARCH = `
	query SmartSearch($query: String!, $limit: Int) {
		smartSearch(query: $query, limit: $limit) {
			file {
				${FILE_FIELDS}
			}
			headline
			rank
		}
	}
`;

export const RECENT_FILES = `
	query RecentFiles($limit: Int) {
		recentFiles(limit: $limit) {
			${FILE_FIELDS}
		}
	}
`;

export const STARRED_FILES = `
	query StarredFiles {
		starredFiles {
			${FILE_FIELDS}
		}
	}
`;
