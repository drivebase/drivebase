import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";

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

mock.module("../../service/provider", () => ({
	ProviderService: mock(() => providerServiceMock),
}));

const getAvailableProvidersMock = mock();
const providersMockExports = {
	getAvailableProviders: getAvailableProvidersMock,
	getProviderRegistration: () => {
		throw new Error("Not implemented in provider resolver test");
	},
	getSensitiveFields: () => [],
	mountPluginRoutes: () => {},
	providerRegistry: {},
	providerSensitiveFields: {},
};
mock.module("../../config/providers", () => providersMockExports);
mock.module("@/config/providers", () => providersMockExports);

import { AuthType, ProviderType } from "../../graphql/generated/types";

let availableProviderResolvers: typeof import("../../graphql/resolvers/provider")["availableProviderResolvers"];
let providerMutations: typeof import("../../graphql/resolvers/provider")["providerMutations"];
let providerQueries: typeof import("../../graphql/resolvers/provider")["providerQueries"];
let storageProviderResolvers: typeof import("../../graphql/resolvers/provider")["storageProviderResolvers"];

beforeAll(async () => {
	const providerResolvers = await import("../../graphql/resolvers/provider");
	availableProviderResolvers = providerResolvers.availableProviderResolvers;
	providerMutations = providerResolvers.providerMutations;
	providerQueries = providerResolvers.providerQueries;
	storageProviderResolvers = providerResolvers.storageProviderResolvers;
});

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
					type: ProviderType.GoogleDrive,
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
		).toBe(ProviderType.GoogleDrive);
		expect(
			storageProviderResolvers.authType?.(
				parent as any,
				{},
				{} as any,
				{} as any,
			),
		).toBe(AuthType.Oauth);
	});

	it("availableProvider authType field resolver maps to uppercase", () => {
		expect(
			availableProviderResolvers.authType({
				authType: "api_key",
			} as any),
		).toBe(AuthType.ApiKey);
	});
});
