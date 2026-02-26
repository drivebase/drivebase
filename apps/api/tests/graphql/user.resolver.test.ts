import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

const userServiceMock = {
	findAll: mock(),
	findById: mock(),
	create: mock(),
	update: mock(),
	delete: mock(),
};

mock.module("../../service/user", () => ({
	UserService: mock(() => userServiceMock),
}));

import { UserRole } from "../../graphql/generated/types";

let userMutations: typeof import("../../graphql/resolvers/user")["userMutations"];
let userQueries: typeof import("../../graphql/resolvers/user")["userQueries"];
let userResolvers: typeof import("../../graphql/resolvers/user")["userResolvers"];

beforeAll(async () => {
	const userResolverModule = await import("../../graphql/resolvers/user");
	userMutations = userResolverModule.userMutations;
	userQueries = userResolverModule.userQueries;
	userResolvers = userResolverModule.userResolvers;
});

describe("user resolvers", () => {
	beforeEach(() => {
		mock.restore();
	});

	it("users query calls service for admin", async () => {
		userServiceMock.findAll.mockResolvedValue([{ id: "u1" }]);
		const context = { db: {}, user: { userId: "u1", role: "admin" } } as any;

		const result = await userQueries.users?.(
			{},
			{ limit: 10, offset: 0 },
			context,
			{} as any,
		);

		expect(userServiceMock.findAll).toHaveBeenCalledWith(10, 0);
		expect(result).toEqual([{ id: "u1" } as any]);
	});

	it("users query throws when unauthorized", async () => {
		const context = { db: {}, user: { userId: "u1", role: "viewer" } } as any;

		await expect(
			userQueries.users?.({}, { limit: 10, offset: 0 }, context, {} as any),
		).rejects.toThrow("Insufficient permissions");
	});

	it("updateUser mutation maps role to lowercase", async () => {
		userServiceMock.update.mockResolvedValue({
			id: "u2",
			role: "admin",
			isActive: true,
		});
		const context = { db: {}, user: { userId: "u1", role: "owner" } } as any;

		await userMutations.updateUser?.(
			{},
			{
				id: "u2",
				input: { role: UserRole.Admin, isActive: true },
			},
			context,
			{} as any,
		);

		expect(userServiceMock.update).toHaveBeenCalledWith("u2", {
			role: "admin",
			isActive: true,
		});
	});

	it("user field resolver maps role to uppercase enum format", () => {
		const result = userResolvers.role?.(
			{ role: "owner" } as any,
			{},
			{} as any,
			{} as any,
		);
		expect(result).toBe(UserRole.Owner);
	});
});
