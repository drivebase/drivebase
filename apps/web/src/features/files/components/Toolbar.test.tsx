import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toolbar } from "./Toolbar";

const useFileExplorerMock = vi.fn();
const useSelectionMock = vi.fn();
const useFilesStoreMock = vi.fn();
const useClipboardStoreMock = vi.fn();

const getByIdMock = vi.fn();
const executeCopyMock = vi.fn();
const executeCutMock = vi.fn();
const executeDeleteMock = vi.fn();
const executePasteMock = vi.fn();

vi.mock("../context/FileExplorerProvider", () => ({
	useFileExplorer: () => useFileExplorerMock(),
}));

vi.mock("../context/SelectionContext", () => ({
	useSelection: () => useSelectionMock(),
}));

vi.mock("@/shared/store/filesStore", () => ({
	useFilesStore: (
		selector: (state: {
			viewMode: "grid" | "table";
			setViewMode: (mode: "grid" | "table") => void;
		}) => unknown,
	) => useFilesStoreMock(selector),
}));

vi.mock("../store/clipboardStore", () => ({
	useClipboardStore: (selector: (state: { items: unknown[] }) => unknown) =>
		useClipboardStoreMock(selector),
}));

describe("Toolbar", () => {
	afterEach(() => {
		cleanup();
	});

	beforeEach(() => {
		executeCopyMock.mockReset();
		executeCutMock.mockReset();
		executeDeleteMock.mockReset();
		executePasteMock.mockReset();
		getByIdMock.mockImplementation((id: string) => {
			const actions: Record<string, { execute: (ctx: unknown) => void }> = {
				"copy-selection": { execute: executeCopyMock },
				"cut-selection": { execute: executeCutMock },
				delete: { execute: executeDeleteMock },
				"paste-selection": { execute: executePasteMock },
			};
			return actions[id];
		});

		useFileExplorerMock.mockReturnValue({
			isLoading: false,
			registry: { getById: getByIdMock },
			actionContext: { selection: [], clearSelection: vi.fn() },
			canWrite: true,
			files: [{ id: "file-1" }, { id: "file-2" }],
			folders: [],
		});
		useSelectionMock.mockReturnValue({
			count: 2,
			selectedItems: [
				{ kind: "file", data: { id: "file-1" } },
				{ kind: "file", data: { id: "file-2" } },
			],
		});
		useFilesStoreMock.mockImplementation(
			(selector: {
				(state: {
					viewMode: "grid" | "table";
					setViewMode: (mode: "grid" | "table") => void;
				}): unknown;
			}) =>
				selector({
					viewMode: "grid",
					setViewMode: vi.fn(),
				}),
		);
		useClipboardStoreMock.mockImplementation(
			(selector: (state: { items: unknown[] }) => unknown) =>
				selector({ items: [{ id: "clip-1" }] }),
		);
	});

	it("shows copy and cut before delete when items are selected", () => {
		render(<Toolbar />);

		const labels = screen
			.getAllByRole("button")
			.map((button) => button.textContent ?? "");

		expect(labels).toContain("Copy (2)");
		expect(labels).toContain("Cut (2)");
		expect(labels).toContain("Delete (2)");
		expect(labels.indexOf("Copy (2)")).toBeLessThan(
			labels.indexOf("Delete (2)"),
		);
		expect(labels.indexOf("Cut (2)")).toBeLessThan(
			labels.indexOf("Delete (2)"),
		);
	});

	it("executes the copy and cut actions from the toolbar", () => {
		render(<Toolbar />);

		fireEvent.click(screen.getByRole("button", { name: "Copy (2)" }));
		fireEvent.click(screen.getByRole("button", { name: "Cut (2)" }));

		expect(executeCopyMock).toHaveBeenCalledTimes(1);
		expect(executeCutMock).toHaveBeenCalledTimes(1);
	});
});
