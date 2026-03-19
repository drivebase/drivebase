import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CreateFolderDialog } from "./CreateFolderDialog";

const useCreateFolderMock = vi.fn();

vi.mock("@/features/files/hooks/useFolders", () => ({
	useCreateFolder: () => useCreateFolderMock(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

vi.mock("@/features/providers/ProviderIcon", () => ({
	ProviderIcon: () => <span data-testid="provider-icon" />,
}));

describe("CreateFolderDialog", () => {
	const createFolderMock = vi.fn();
	const onClose = vi.fn();
	const onCreated = vi.fn();

	afterEach(() => {
		cleanup();
	});

	beforeEach(() => {
		createFolderMock.mockReset();
		onClose.mockReset();
		onCreated.mockReset();
		vi.mocked(toast.error).mockReset();
		useCreateFolderMock.mockReturnValue([
			{ fetching: false },
			createFolderMock,
		]);
	});

	it("locks provider selection to the current folder provider", async () => {
		createFolderMock.mockResolvedValue({
			data: { createFolder: { id: "folder-1", name: "Nested Folder" } },
		});

		render(
			<CreateFolderDialog
				isOpen
				onClose={onClose}
				onCreated={onCreated}
				parentId="parent-1"
				currentFolderName="Reports"
				currentFolderProviderId="provider-1"
				currentFolderProviderName="Dropbox"
				providers={[
					{
						id: "provider-1",
						name: "Dropbox",
						type: "dropbox",
						isActive: true,
					},
					{ id: "provider-2", name: "S3", type: "s3", isActive: true },
				]}
			/>,
		);

		expect(screen.queryByText("Storage Provider")).toBeNull();
		expect(
			screen.getByText(/Create a new folder in "Reports" on Dropbox\./),
		).not.toBeNull();

		fireEvent.change(screen.getByLabelText("Folder Name"), {
			target: { value: "Nested Folder" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create Folder" }));

		await waitFor(() => {
			expect(createFolderMock).toHaveBeenCalledWith({
				input: {
					name: "Nested Folder",
					parentId: "parent-1",
					providerId: "provider-1",
				},
			});
			expect(onCreated).toHaveBeenCalled();
			expect(onClose).toHaveBeenCalled();
		});
	});

	it("shows a toast and stays open when creation fails", async () => {
		createFolderMock.mockResolvedValue({
			error: {
				message:
					"Parent folder and provider must belong to the same storage provider",
			},
		});

		render(
			<CreateFolderDialog
				isOpen
				onClose={onClose}
				parentId="parent-1"
				currentFolderProviderId="provider-1"
				providers={[
					{
						id: "provider-1",
						name: "Dropbox",
						type: "dropbox",
						isActive: true,
					},
				]}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Folder Name"), {
			target: { value: "Broken Folder" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Create Folder" }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Parent folder and provider must belong to the same storage provider",
			);
			expect(onClose).not.toHaveBeenCalled();
		});
	});
});
