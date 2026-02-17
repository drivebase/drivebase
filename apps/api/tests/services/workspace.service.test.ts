import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("../../utils/logger", () => ({
	logger: {
		debug: mock(),
		info: mock(),
		error: mock(),
	},
}));

mock.module("@drivebase/db", () => ({
	workspaces: {
		id: "workspace_id",
		ownerId: "workspace_owner_id",
		createdAt: "workspace_created_at",
	},
}));

import {
	createDefaultWorkspace,
	getOwnedWorkspaceId,
} from "../../services/workspace/workspace";

type WorkspaceRow = {
	id: string;
	name?: string;
	ownerId?: string;
};

type WorkspaceDbMock = {
	insert: ReturnType<typeof mock>;
	values: ReturnType<typeof mock>;
	returning: ReturnType<typeof mock>;
	select: ReturnType<typeof mock>;
	from: ReturnType<typeof mock>;
	where: ReturnType<typeof mock>;
	orderBy: ReturnType<typeof mock>;
	limit: ReturnType<typeof mock>;
};

function createDbMock(): WorkspaceDbMock {
	const db = {
		insert: mock(),
		values: mock(),
		returning: mock(),
		select: mock(),
		from: mock(),
		where: mock(),
		orderBy: mock(),
		limit: mock(),
	};

	db.insert.mockReturnValue(db);
	db.values.mockReturnValue(db);
	db.select.mockReturnValue(db);
	db.from.mockReturnValue(db);
	db.where.mockReturnValue(db);
	db.orderBy.mockReturnValue(db);

	return db;
}

describe("workspace service", () => {
	let db: WorkspaceDbMock;

	beforeEach(() => {
		mock.restore();
		db = createDbMock();
	});

	it("createDefaultWorkspace creates My Workspace for owner", async () => {
		const insertedWorkspace: WorkspaceRow = {
			id: "ws-1",
			name: "My Workspace",
			ownerId: "user-1",
		};
		db.returning.mockResolvedValue([insertedWorkspace]);

		const result = await createDefaultWorkspace(
			db as unknown as {
				insert: WorkspaceDbMock["insert"];
				select: WorkspaceDbMock["select"];
			},
			"user-1",
		);

		expect(db.values).toHaveBeenCalledWith({
			name: "My Workspace",
			ownerId: "user-1",
		});
		expect(result).toEqual(insertedWorkspace);
	});

	it("getOwnedWorkspaceId returns first existing workspace id", async () => {
		db.limit.mockResolvedValue([{ id: "ws-existing" }]);

		const workspaceId = await getOwnedWorkspaceId(
			db as unknown as {
				insert: WorkspaceDbMock["insert"];
				select: WorkspaceDbMock["select"];
			},
			"user-1",
		);

		expect(workspaceId).toBe("ws-existing");
		expect(db.insert).not.toHaveBeenCalled();
	});

	it("getOwnedWorkspaceId creates default workspace when none exists", async () => {
		db.limit.mockResolvedValueOnce([]);
		db.returning.mockResolvedValueOnce([
			{ id: "ws-created", name: "My Workspace", ownerId: "user-2" },
		]);

		const workspaceId = await getOwnedWorkspaceId(
			db as unknown as {
				insert: WorkspaceDbMock["insert"];
				select: WorkspaceDbMock["select"];
			},
			"user-2",
		);

		expect(workspaceId).toBe("ws-created");
		expect(db.values).toHaveBeenCalledWith({
			name: "My Workspace",
			ownerId: "user-2",
		});
	});
});
