import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUpload } from "./useUpload";

const useAuthStoreMock = vi.fn();
const useProvidersMock = vi.fn();
const useFileRulesMock = vi.fn();
const useRequestUploadMock = vi.fn();
const useDeleteFileMock = vi.fn();
const useChunkedUploadMock = vi.fn();
const progressCreateMock = vi.fn();
const progressUpdateMock = vi.fn();
const progressDoneMock = vi.fn();
const progressErrorMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("axios", () => ({
	default: vi.fn(),
}));

vi.mock("@/features/auth/store/authStore", () => ({
	useAuthStore: () => useAuthStoreMock(),
}));

vi.mock("@/features/providers/hooks/useProviders", () => ({
	useProviders: () => useProvidersMock(),
}));

vi.mock("@/features/rules/hooks/useRules", () => ({
	useFileRules: () => useFileRulesMock(),
}));

vi.mock("@/features/files/hooks/useFiles", () => ({
	useRequestUpload: () => useRequestUploadMock(),
	useDeleteFile: () => useDeleteFileMock(),
}));

vi.mock("@/features/files/hooks/useChunkedUpload", () => ({
	useChunkedUpload: () => useChunkedUploadMock(),
}));

vi.mock("@/shared/lib/progressPanel", () => ({
	progressPanel: {
		create: (...args: unknown[]) => progressCreateMock(...args),
		update: (...args: unknown[]) => progressUpdateMock(...args),
		done: (...args: unknown[]) => progressDoneMock(...args),
		error: (...args: unknown[]) => progressErrorMock(...args),
	},
}));

vi.mock("sonner", () => ({
	toast: {
		error: (...args: unknown[]) => toastErrorMock(...args),
	},
}));

describe("useUpload", () => {
	const requestUploadExecuteMock = vi.fn();
	const deleteFileExecuteMock = vi.fn();
	const onUploadComplete = vi.fn();

	afterEach(() => {
		cleanup();
	});

	beforeEach(() => {
		requestUploadExecuteMock.mockReset();
		deleteFileExecuteMock.mockReset();
		onUploadComplete.mockReset();
		progressCreateMock.mockReset();
		progressUpdateMock.mockReset();
		progressDoneMock.mockReset();
		progressErrorMock.mockReset();
		toastErrorMock.mockReset();
		vi.mocked(axios).mockReset();

		useAuthStoreMock.mockReturnValue({ token: "token-1" });
		useProvidersMock.mockReturnValue({
			data: {
				storageProviders: [
					{ id: "provider-1", isActive: true },
					{ id: "provider-2", isActive: true },
				],
			},
		});
		useFileRulesMock.mockReturnValue([{ data: { fileRules: [] } }]);
		useRequestUploadMock.mockReturnValue([{}, requestUploadExecuteMock]);
		useDeleteFileMock.mockReturnValue([{}, deleteFileExecuteMock]);
		useChunkedUploadMock.mockReturnValue({
			uploadChunked: vi.fn(),
			cancelSession: vi.fn(),
			retrySession: vi.fn(),
		});
		progressCreateMock.mockReturnValue("pp-1");
		requestUploadExecuteMock.mockResolvedValue({
			data: {
				requestUpload: {
					fileId: "file-1",
					uploadUrl: "https://upload.test",
					uploadFields: null,
					useDirectUpload: true,
				},
			},
		});
		vi.mocked(axios).mockResolvedValue({ status: 200 });
	});

	it("uses the current folder provider for uploads inside a folder", async () => {
		const { result } = renderHook(() =>
			useUpload({
				currentFolderId: "folder-1",
				currentFolderProviderId: "provider-2",
				onUploadComplete,
			}),
		);

		const file = new File(["hello"], "hello.txt", { type: "text/plain" });

		await act(async () => {
			result.current.handleFilesSelected([file]);
		});

		await waitFor(() => {
			expect(requestUploadExecuteMock).toHaveBeenCalledWith({
				input: {
					name: "hello.txt",
					mimeType: "text/plain",
					size: file.size,
					folderId: "folder-1",
					providerId: "provider-2",
				},
			});
		});

		expect(result.current.isUploadDialogOpen).toBe(false);
	});

	it("does not open the provider dialog when the folder provider is still loading", async () => {
		const { result } = renderHook(() =>
			useUpload({
				currentFolderId: "folder-1",
				currentFolderProviderId: undefined,
				onUploadComplete,
			}),
		);

		const file = new File(["hello"], "hello.txt", { type: "text/plain" });

		await act(async () => {
			result.current.handleFilesSelected([file]);
		});

		expect(requestUploadExecuteMock).not.toHaveBeenCalled();
		expect(result.current.isUploadDialogOpen).toBe(false);
		expect(toastErrorMock).toHaveBeenCalledWith(
			"Current folder details are still loading. Try the upload again in a moment.",
		);
	});
});
