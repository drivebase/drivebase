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

export const GET_FOLDER = `
	query GetFolder($id: ID!) {
		folder(id: $id) {
			${FOLDER_FIELDS}
		}
	}
`;

export const LIST_FOLDERS = `
	query ListFolders($parentId: ID, $providerIds: [ID!]) {
		folders(parentId: $parentId, providerIds: $providerIds) {
			${FOLDER_FIELDS}
		}
	}
`;

export const STARRED_FOLDERS = `
	query StarredFolders {
		starredFolders {
			${FOLDER_FIELDS}
		}
	}
`;
