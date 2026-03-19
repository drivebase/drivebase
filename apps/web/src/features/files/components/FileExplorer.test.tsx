import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileExplorer } from "./FileExplorer";

const useFileExplorerMock = vi.fn();
const useSelectionMock = vi.fn();
const useFilesStoreMock = vi.fn();
const useFileTableMock = vi.fn();

vi.mock("../context/FileExplorerProvider", () => ({
	useFileExplorer: () => useFileExplorerMock(),
}));

vi.mock("../context/SelectionContext", () => ({
	useSelection: () => useSelectionMock(),
}));

vi.mock("@/shared/store/filesStore", () => ({
	useFilesStore: (
		selector: (state: { viewMode: "grid" | "table" }) => unknown,
	) => useFilesStoreMock(selector),
}));

vi.mock("../hooks/useKeyboardShortcuts", () => ({
	useKeyboardShortcuts: () => {},
}));

vi.mock("./table/useFileTable", () => ({
	useFileTable: () => useFileTableMock(),
}));

vi.mock("./Toolbar", () => ({
	Toolbar: ({ table }: { table?: unknown }) => (
		<div data-testid="toolbar" data-has-table={table ? "true" : "false"} />
	),
}));

vi.mock("./BlankAreaContextMenu", () => ({
	BlankAreaContextMenu: ({ children }: { children: ReactNode }) => (
		<div data-testid="blank-area-context-menu">{children}</div>
	),
}));

vi.mock("./grid/GridView", () => ({
	GridView: () => <div data-testid="grid-view" />,
}));

vi.mock("./table/TableView", () => ({
	TableView: ({
		table,
		emptyColSpan,
	}: {
		table: unknown;
		emptyColSpan: number;
	}) => (
		<div
			data-testid="table-view"
			data-has-table={table ? "true" : "false"}
			data-empty-col-span={String(emptyColSpan)}
		/>
	),
}));

vi.mock("./file-system-table/FileSystemTableEmpty", () => ({
	FileSystemTableEmpty: () => <div data-testid="empty-state" />,
}));

vi.mock("./file-system-table/FileSystemTableLoading", () => ({
	FileSystemTableLoading: () => <div data-testid="loading-state" />,
}));

describe("FileExplorer", () => {
	afterEach(() => {
		cleanup();
	});

	beforeEach(() => {
		useFileExplorerMock.mockReturnValue({
			files: [],
			folders: [],
			isLoading: false,
			registry: {},
			actionContext: {},
		});
		useSelectionMock.mockReturnValue({
			selectAll: vi.fn(),
			selectOnly: vi.fn(),
			clear: vi.fn(),
		});
		useFilesStoreMock.mockImplementation(
			(selector: (state: { viewMode: "grid" | "table" }) => unknown) =>
				selector({ viewMode: "grid" }),
		);
		useFileTableMock.mockReturnValue({
			table: { id: "table-instance" },
			emptyColSpan: 5,
		});
	});

	it("keeps the toolbar visible in an empty folder", () => {
		render(<FileExplorer />);

		expect(screen.getByTestId("toolbar")).not.toBeNull();
		expect(screen.getByTestId("toolbar").getAttribute("data-has-table")).toBe(
			"false",
		);
		expect(screen.getByTestId("empty-state")).not.toBeNull();
		expect(screen.getByTestId("blank-area-context-menu")).not.toBeNull();
	});

	it("renders a single shared toolbar in grid view", () => {
		useFileExplorerMock.mockReturnValue({
			files: [{ id: "file-1" }],
			folders: [],
			isLoading: false,
			registry: {},
			actionContext: {},
		});

		render(<FileExplorer />);

		expect(screen.getAllByTestId("toolbar")).toHaveLength(1);
		expect(screen.getByTestId("grid-view")).not.toBeNull();
	});

	it("passes the table instance to the shared toolbar in table view", () => {
		useFileExplorerMock.mockReturnValue({
			files: [{ id: "file-1" }],
			folders: [],
			isLoading: false,
			registry: {},
			actionContext: {},
		});
		useFilesStoreMock.mockImplementation(
			(selector: (state: { viewMode: "grid" | "table" }) => unknown) =>
				selector({ viewMode: "table" }),
		);

		render(<FileExplorer />);

		expect(screen.getAllByTestId("toolbar")).toHaveLength(1);
		expect(screen.getByTestId("toolbar").getAttribute("data-has-table")).toBe(
			"true",
		);
		expect(
			screen.getByTestId("table-view").getAttribute("data-empty-col-span"),
		).toBe("5");
	});
});
