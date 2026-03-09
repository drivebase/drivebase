import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const getAccessibleWorkspaceId = mock();
const getAccessibleProviderIds = mock();

const requestUpload = mock();
const getFile = mock();
const getFileForProxy = mock();
const listFiles = mock();
const searchFiles = mock();
const searchFolders = mock();
const getRecentFiles = mock();
const requestDownload = mock();
const downloadFile = mock();
const downloadFileForProxy = mock();
const renameFile = mock();
const moveFile = mock();
const moveFileToProvider = mock();
const deleteFile = mock();
const getFileMetadata = mock();
const starFile = mock();
const unstarFile = mock();
const getContents = mock();
const getStarredFiles = mock();
const createFileDownloadLink = mock();
const listActiveFileDownloadLinks = mock();
const revokeFileDownloadLink = mock();
const consumeFileDownloadLink = mock();
const smartSearch = mock();
const archiveFile = mock();
const requestFileRestore = mock();
const refreshFileLifecycle = mock();

mock.module("../../../service/workspace", () => ({
	getAccessibleWorkspaceId,
	getAccessibleProviderIds,
}));

mock.module("../../../service/file/index", () => ({
	requestUpload,
	getFile,
	getFileForProxy,
	listFiles,
	searchFiles,
	searchFolders,
	getRecentFiles,
	requestDownload,
	downloadFile,
	downloadFileForProxy,
	renameFile,
	moveFile,
	moveFileToProvider,
	deleteFile,
	getFileMetadata,
	starFile,
	unstarFile,
	getContents,
	getStarredFiles,
	createFileDownloadLink,
	listActiveFileDownloadLinks,
	revokeFileDownloadLink,
	consumeFileDownloadLink,
	smartSearch,
	archiveFile,
	requestFileRestore,
	refreshFileLifecycle,
}));

import { FileService } from "../../../service/file.ts";

describe("FileService facade", () => {
	const db = { marker: "db" };

	afterAll(() => {
		mock.restore();
	});

	beforeEach(() => {
		getAccessibleWorkspaceId.mockReset();
		getAccessibleProviderIds.mockReset();
		requestUpload.mockReset();
		getFile.mockReset();
		getFileForProxy.mockReset();
		listFiles.mockReset();
		searchFiles.mockReset();
		searchFolders.mockReset();
		getRecentFiles.mockReset();
		requestDownload.mockReset();
		downloadFile.mockReset();
		downloadFileForProxy.mockReset();
		renameFile.mockReset();
		moveFile.mockReset();
		moveFileToProvider.mockReset();
		deleteFile.mockReset();
		getFileMetadata.mockReset();
		starFile.mockReset();
		unstarFile.mockReset();
		getContents.mockReset();
		getStarredFiles.mockReset();
		createFileDownloadLink.mockReset();
		listActiveFileDownloadLinks.mockReset();
		revokeFileDownloadLink.mockReset();
		consumeFileDownloadLink.mockReset();
		smartSearch.mockReset();

		getAccessibleWorkspaceId.mockResolvedValue("ws-1");
		// Default: no provider restrictions (owner/admin)
		getAccessibleProviderIds.mockResolvedValue(null);
	});

	describe("read operations — no provider restriction (null)", () => {
		it("passes null allowedProviderIds to listFiles when user has full access", async () => {
			const service = new FileService(db as any);
			await service.listFiles("user-1", "pref-ws", "folder-1", 20, 5);
			expect(listFiles).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				"folder-1",
				20,
				5,
				null,
			);
		});

		it("passes null allowedProviderIds to searchFiles when user has full access", async () => {
			const service = new FileService(db as any);
			await service.searchFiles("user-1", "query", 10, "pref-ws");
			expect(searchFiles).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				"query",
				10,
				null,
			);
		});

		it("passes null allowedProviderIds to searchFolders when user has full access", async () => {
			const service = new FileService(db as any);
			await service.searchFolders("user-1", "query", 10, "pref-ws");
			expect(searchFolders).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				"query",
				10,
				null,
			);
		});

		it("passes null allowedProviderIds to getRecentFiles when user has full access", async () => {
			const service = new FileService(db as any);
			await service.getRecentFiles("user-1", 5, "pref-ws");
			expect(getRecentFiles).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				5,
				null,
			);
		});

		it("passes null allowedProviderIds to getStarredFiles when user has full access", async () => {
			const service = new FileService(db as any);
			await service.getStarredFiles("user-1", "pref-ws");
			expect(getStarredFiles).toHaveBeenCalledWith(db, "user-1", "ws-1", null);
		});

		it("passes full providerIds to getContents when user has full access", async () => {
			const service = new FileService(db as any);
			await service.getContents("user-1", "pref-ws", "folder-1", [
				"p-1",
				"p-2",
			]);
			// No access restriction: client-requested providerIds pass through unchanged
			expect(getContents).toHaveBeenCalledWith(
				db,
				"ws-1",
				"user-1",
				"folder-1",
				["p-1", "p-2"],
			);
		});
	});

	describe("read operations — with provider restriction", () => {
		beforeEach(() => {
			getAccessibleProviderIds.mockResolvedValue([
				"p-allowed-1",
				"p-allowed-2",
			]);
		});

		it("passes allowedProviderIds to listFiles when user is restricted", async () => {
			const service = new FileService(db as any);
			await service.listFiles("user-1", "pref-ws", undefined, 20, 0);
			expect(listFiles).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				undefined,
				20,
				0,
				["p-allowed-1", "p-allowed-2"],
			);
		});

		it("passes allowedProviderIds to searchFiles when user is restricted", async () => {
			const service = new FileService(db as any);
			await service.searchFiles("user-1", "query", 10, "pref-ws");
			expect(searchFiles).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				"query",
				10,
				["p-allowed-1", "p-allowed-2"],
			);
		});

		it("passes allowedProviderIds to getRecentFiles when user is restricted", async () => {
			const service = new FileService(db as any);
			await service.getRecentFiles("user-1", 5, "pref-ws");
			expect(getRecentFiles).toHaveBeenCalledWith(db, "user-1", "ws-1", 5, [
				"p-allowed-1",
				"p-allowed-2",
			]);
		});

		it("intersects client providerIds with access grants in getContents", async () => {
			const service = new FileService(db as any);
			// Client requests p-allowed-1 and p-not-allowed: only p-allowed-1 should pass
			await service.getContents("user-1", "pref-ws", undefined, [
				"p-allowed-1",
				"p-not-allowed",
			]);
			expect(getContents).toHaveBeenCalledWith(
				db,
				"ws-1",
				"user-1",
				undefined,
				["p-allowed-1"],
			);
		});

		it("uses only access grants in getContents when client sends no providerIds", async () => {
			const service = new FileService(db as any);
			await service.getContents("user-1", "pref-ws", undefined, undefined);
			expect(getContents).toHaveBeenCalledWith(
				db,
				"ws-1",
				"user-1",
				undefined,
				["p-allowed-1", "p-allowed-2"],
			);
		});

		it("passes allowedProviderIds to getStarredFiles when user is restricted", async () => {
			const service = new FileService(db as any);
			await service.getStarredFiles("user-1", "pref-ws");
			expect(getStarredFiles).toHaveBeenCalledWith(db, "user-1", "ws-1", [
				"p-allowed-1",
				"p-allowed-2",
			]);
		});
	});

	describe("mutation operations — workspace only, no access check needed", () => {
		it("forwards mutation and transfer calls", async () => {
			const service = new FileService(db as any);

			await service.requestUpload(
				"user-1",
				"a.txt",
				"text/plain",
				100,
				undefined,
				"provider-1",
				"pref-ws",
			);
			await service.requestDownload("file-1", "user-1", "pref-ws");
			await service.renameFile("file-1", "user-1", "renamed.txt", "pref-ws");
			await service.moveFile("file-1", "user-1", "folder-2", "pref-ws");
			await service.moveFileToProvider(
				"file-1",
				"user-1",
				"provider-2",
				"pref-ws",
			);
			await service.deleteFile("file-1", "user-1", "pref-ws");
			await service.starFile("file-1", "user-1", "pref-ws");
			await service.unstarFile("file-1", "user-1", "pref-ws");

			expect(requestUpload).toHaveBeenCalledWith(
				db,
				"user-1",
				"ws-1",
				"a.txt",
				"text/plain",
				100,
				undefined,
				"provider-1",
			);
			expect(requestDownload).toHaveBeenCalledWith(
				db,
				"file-1",
				"user-1",
				"ws-1",
			);
			expect(renameFile).toHaveBeenCalledWith(
				db,
				"file-1",
				"user-1",
				"renamed.txt",
				"ws-1",
			);
			expect(moveFile).toHaveBeenCalledWith(
				db,
				"file-1",
				"user-1",
				"ws-1",
				"folder-2",
			);
			expect(moveFileToProvider).toHaveBeenCalledWith(
				db,
				"file-1",
				"user-1",
				"provider-2",
				"ws-1",
			);
			expect(deleteFile).toHaveBeenCalledWith(db, "file-1", "user-1", "ws-1");
			expect(starFile).toHaveBeenCalledWith(db, "file-1", "user-1", "ws-1");
			expect(unstarFile).toHaveBeenCalledWith(db, "file-1", "user-1", "ws-1");
		});
	});

	describe("download link operations", () => {
		it("forwards file download link calls and supports token consumption", async () => {
			const service = new FileService(db as any);

			await service.createFileDownloadLink(
				"file-1",
				"user-1",
				10,
				new Date("2030-01-01T00:00:00.000Z"),
				"pref-ws",
			);
			await service.listActiveFileDownloadLinks("file-1", "user-1", "pref-ws");
			await service.revokeFileDownloadLink("invite-1", "user-1", "pref-ws");
			await service.consumeFileDownloadLink("fdl_test");

			expect(createFileDownloadLink).toHaveBeenCalledWith(
				db,
				"file-1",
				"user-1",
				"ws-1",
				10,
				new Date("2030-01-01T00:00:00.000Z"),
			);
			expect(listActiveFileDownloadLinks).toHaveBeenCalledWith(
				db,
				"file-1",
				"user-1",
				"ws-1",
			);
			expect(revokeFileDownloadLink).toHaveBeenCalledWith(
				db,
				"invite-1",
				"ws-1",
			);
			expect(consumeFileDownloadLink).toHaveBeenCalledWith(db, "fdl_test");
		});
	});
});
