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

export const REQUEST_UPLOAD = `
	mutation RequestUpload($input: RequestUploadInput!) {
		requestUpload(input: $input) {
			fileId
			uploadUrl
			uploadFields
			useDirectUpload
		}
	}
`;

export const REQUEST_DOWNLOAD = `
	mutation RequestDownload($id: ID!) {
		requestDownload(id: $id) {
			fileId
			downloadUrl
			useDirectDownload
		}
	}
`;

export const RENAME_FILE = `
	mutation RenameFile($id: ID!, $name: String!) {
		renameFile(id: $id, name: $name) {
			${FILE_FIELDS}
		}
	}
`;

export const MOVE_FILE = `
	mutation MoveFile($id: ID!, $folderId: ID) {
		moveFile(id: $id, folderId: $folderId) {
			${FILE_FIELDS}
		}
	}
`;

export const DELETE_FILE = `
	mutation DeleteFile($id: ID!) {
		deleteFile(id: $id)
	}
`;

export const STAR_FILE = `
	mutation StarFile($id: ID!) {
		starFile(id: $id) {
			${FILE_FIELDS}
		}
	}
`;

export const UNSTAR_FILE = `
	mutation UnstarFile($id: ID!) {
		unstarFile(id: $id) {
			${FILE_FIELDS}
		}
	}
`;

export const INITIATE_CHUNKED_UPLOAD = `
	mutation InitiateChunkedUpload($input: InitiateChunkedUploadInput!) {
		initiateChunkedUpload(input: $input) {
			sessionId
			totalChunks
			chunkSize
			useDirectUpload
			presignedPartUrls {
				partNumber
				url
			}
		}
	}
`;

export const COMPLETE_S3_MULTIPART = `
	mutation CompleteS3MultipartUpload($sessionId: ID!, $parts: [S3PartInput!]!) {
		completeS3MultipartUpload(sessionId: $sessionId, parts: $parts)
	}
`;

export const CANCEL_UPLOAD_SESSION = `
	mutation CancelUploadSession($sessionId: ID!) {
		cancelUploadSession(sessionId: $sessionId)
	}
`;
