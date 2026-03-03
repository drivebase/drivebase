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

export const CREATE_FOLDER = `
	mutation CreateFolder($input: CreateFolderInput!) {
		createFolder(input: $input) {
			${FOLDER_FIELDS}
		}
	}
`;

export const RENAME_FOLDER = `
	mutation RenameFolder($id: ID!, $name: String!) {
		renameFolder(id: $id, name: $name) {
			${FOLDER_FIELDS}
		}
	}
`;

export const MOVE_FOLDER = `
	mutation MoveFolder($id: ID!, $parentId: ID) {
		moveFolder(id: $id, parentId: $parentId) {
			${FOLDER_FIELDS}
		}
	}
`;

export const DELETE_FOLDER = `
	mutation DeleteFolder($id: ID!) {
		deleteFolder(id: $id)
	}
`;

export const STAR_FOLDER = `
	mutation StarFolder($id: ID!) {
		starFolder(id: $id) {
			${FOLDER_FIELDS}
		}
	}
`;

export const UNSTAR_FOLDER = `
	mutation UnstarFolder($id: ID!) {
		unstarFolder(id: $id) {
			${FOLDER_FIELDS}
		}
	}
`;
