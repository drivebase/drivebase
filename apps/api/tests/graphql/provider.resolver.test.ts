import { beforeEach, describe, expect, it, mock } from "bun:test";

const providerServiceMock = {
	getProviders: mock(),
	getProvider: mock(),
	connectProvider: mock(),
	disconnectProvider: mock(),
	syncProvider: mock(),
	updateProviderQuota: mock(),
	initiateOAuth: mock(),
	getProviderConfigPreview: mock(),
};

mock.module("../../services/provider", () => ({
	ProviderService: mock(() => providerServiceMock),
}));

const getAvailableProvidersMock = mock();
mock.module("../../config/providers", () => ({
	getAvailableProviders: getAvailableProvidersMock,
}));

import {
	AuthType,
	availableProviderResolvers,
	ProviderType,
	providerMutations,
	providerQueries,
	storageProviderResolvers,
} from "../../graphql/resolvers/provider";

describe("provider resolvers", () => {
	beforeEach(() => {
		mock.restore();
	});

	it("availableProviders query returns provider catalog", async () => {
		getAvailableProvidersMock.mockReturnValue([
			{ id: "google_drive", authType: "oauth" },
		]);
		const context = { db: {}, user: { userId: "u1", role: "admin" } } as any;

		const result = await providerQueries.availableProviders?.(
			{},
			{},
			context,
			{} as any,
		);
		expect(result).toEqual([{ id: "google_drive", authType: "oauth" } as any]);
	});

	it("connectStorage lowercases provider type for service", async () => {
		providerServiceMock.connectProvider.mockResolvedValue({ id: "p1" });
		const context = { db: {}, user: { userId: "u1", role: "admin" } } as any;

		await providerMutations.connectStorage?.(
			{},
			{
				input: {
					name: "Drive",
					type: "GOOGLE_DRIVE" as ProviderType,
					config: { x: 1 },
				},
			},
			context,
			{} as any,
		);

		expect(providerServiceMock.connectProvider).toHaveBeenCalledWith(
			"u1",
			"Drive",
			"google_drive",
			{ x: 1 },
			undefined,
			undefined,
		);
	});

	it("storageProvider type/authType field resolvers map to uppercase", () => {
		const parent = { type: "google_drive", authType: "oauth" };

		expect(
			storageProviderResolvers.type?.(parent as any, {}, {} as any, {} as any),
		).toBe("GOOGLE_DRIVE");
		expect(
			storageProviderResolvers.authType?.(
				parent as any,
				{},
				{} as any,
				{} as any,
			),
		).toBe("OAUTH");
	});

	it("availableProvider authType field resolver maps to uppercase", () => {
		expect(
			availableProviderResolvers.authType({
				authType: "api_key",
			} as any),
		).toBe("API_KEY");
	});
});
