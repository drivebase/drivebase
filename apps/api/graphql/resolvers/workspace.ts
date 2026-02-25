import {
	getOrCreateWorkspaceAiSettings,
	getWorkspaceAiProgress,
	updateWorkspaceAiSettings,
} from "../../service/ai/ai-settings";
import {
	deleteWorkspaceAiData,
	enqueueWorkspaceBackfill,
	retryWorkspaceFailedAiFiles,
	stopWorkspaceAiProcessing,
} from "../../service/ai/analysis-jobs";
import {
	scheduleModelPreparation,
	syncWorkspaceModelReadiness,
} from "../../service/ai/model-download";
import {
	acceptWorkspaceInvite,
	createWorkspace,
	createWorkspaceInvite,
	getWorkspaceStats,
	listAccessibleWorkspaces,
	listActiveWorkspaceInvites,
	listWorkspaceMembers,
	removeWorkspaceMember,
	requireWorkspaceRole,
	revokeWorkspaceInvite,
	updateWorkspaceMemberRole,
	updateWorkspaceName,
	updateWorkspaceSyncOperationsToProvider,
} from "../../service/workspace";
import type {
	AiModelTask,
	MutationResolvers,
	QueryResolvers,
	SubscriptionResolvers,
	WorkspaceAiProgress as WorkspaceAiProgressType,
	WorkspaceAiSettings as WorkspaceAiSettingsType,
	WorkspaceColor,
	WorkspaceInvite,
	WorkspaceInviteResolvers,
	WorkspaceMember,
	WorkspaceMemberResolvers,
	WorkspaceMemberRole,
	WorkspaceResolvers,
	Workspace as WorkspaceType,
} from "../generated/types";
import { AnalysisModelTier } from "../generated/types";
import { type PubSubChannels, pubSub } from "../pubsub";
import { requireAuth } from "./auth-helpers";

function toWorkspaceType(workspace: {
	id: string;
	name: string;
	color: string;
	ownerId: string;
	syncOperationsToProvider: boolean;
	createdAt: Date;
	updatedAt: Date;
}): WorkspaceType {
	return {
		...workspace,
		color: workspace.color.toUpperCase() as WorkspaceColor,
	};
}

function toWorkspaceMemberType(member: {
	userId: string;
	name: string;
	email: string;
	role: string;
	joinedAt: Date;
	isOwner: boolean;
}): WorkspaceMember {
	return {
		...member,
		role: member.role.toUpperCase() as WorkspaceMemberRole,
	};
}

function toWorkspaceInviteType(invite: {
	id: string;
	token: string;
	role: string;
	expiresAt: Date;
	createdAt: Date;
}): WorkspaceInvite {
	return {
		...invite,
		role: invite.role.toUpperCase() as WorkspaceMemberRole,
	};
}

function toAnalysisModelTier(
	tier: "lightweight" | "medium" | "heavy",
): AnalysisModelTier {
	if (tier === "lightweight") return AnalysisModelTier.Lightweight;
	if (tier === "heavy") return AnalysisModelTier.Heavy;
	return AnalysisModelTier.Medium;
}

function fromAnalysisModelTier(
	tier?: string | null,
): "lightweight" | "medium" | "heavy" | undefined {
	if (!tier) return undefined;
	if (tier === "LIGHTWEIGHT") return "lightweight";
	if (tier === "HEAVY") return "heavy";
	return "medium";
}

function fromAiModelTask(task: AiModelTask): "embedding" | "ocr" {
	if (task === "EMBEDDING") return "embedding";
	return "ocr";
}

function toWorkspaceAiSettingsType(settings: {
	workspaceId: string;
	enabled: boolean;
	embeddingTier: "lightweight" | "medium" | "heavy";
	ocrTier: "lightweight" | "medium" | "heavy";
	modelsReady: boolean;
	maxConcurrency: number;
	config: Record<string, unknown>;
	updatedAt: Date;
}): WorkspaceAiSettingsType {
	return {
		workspaceId: settings.workspaceId,
		enabled: settings.enabled,
		modelsReady: settings.modelsReady,
		embeddingTier: toAnalysisModelTier(settings.embeddingTier),
		ocrTier: toAnalysisModelTier(settings.ocrTier),
		maxConcurrency: settings.maxConcurrency,
		config: settings.config,
		updatedAt: settings.updatedAt,
	};
}

function toWorkspaceAiProgressType(progress: {
	workspaceId: string;
	eligibleFiles: number;
	processedFiles: number;
	pendingFiles: number;
	runningFiles: number;
	failedFiles: number;
	skippedFiles: number;
	completedFiles: number;
	completionPct: number;
	updatedAt: Date;
}): WorkspaceAiProgressType {
	return {
		workspaceId: progress.workspaceId,
		eligibleFiles: progress.eligibleFiles,
		processedFiles: progress.processedFiles,
		pendingFiles: progress.pendingFiles,
		runningFiles: progress.runningFiles,
		failedFiles: progress.failedFiles,
		skippedFiles: progress.skippedFiles,
		completedFiles: progress.completedFiles,
		completionPct: progress.completionPct,
		updatedAt: progress.updatedAt,
	};
}

export const workspaceQueries: QueryResolvers = {
	workspaces: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const workspaces = await listAccessibleWorkspaces(context.db, user.userId);
		return workspaces.map(toWorkspaceType);
	},

	workspaceMembers: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
			"editor",
			"viewer",
		]);
		const members = await listWorkspaceMembers(context.db, args.workspaceId);
		return members.map(toWorkspaceMemberType);
	},

	workspaceInvites: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		const invites = await listActiveWorkspaceInvites(
			context.db,
			args.workspaceId,
		);
		return invites.map(toWorkspaceInviteType);
	},

	workspaceStats: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
			"editor",
			"viewer",
		]);
		return getWorkspaceStats(context.db, args.workspaceId, args.days ?? 30);
	},

	workspaceAiSettings: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
			"editor",
			"viewer",
		]);
		const settings = await getOrCreateWorkspaceAiSettings(
			context.db,
			args.workspaceId,
		);
		const synced =
			(await syncWorkspaceModelReadiness(context.db, args.workspaceId)) ??
			settings;
		return toWorkspaceAiSettingsType(synced);
	},

	workspaceAiProgress: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
			"editor",
			"viewer",
		]);
		const progress = await getWorkspaceAiProgress(context.db, args.workspaceId);
		return toWorkspaceAiProgressType(progress);
	},
};

export const workspaceMutations: MutationResolvers = {
	createWorkspace: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspace = await createWorkspace(
			context.db,
			user.userId,
			args.input.name,
			args.input.color.toLowerCase(),
		);
		return toWorkspaceType(workspace);
	},

	createWorkspaceInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const invite = await createWorkspaceInvite(
			context.db,
			args.input.workspaceId,
			user.userId,
			args.input.role.toLowerCase() as "admin" | "editor" | "viewer",
			args.input.expiresInDays ?? 7,
		);
		return toWorkspaceInviteType(invite);
	},

	acceptWorkspaceInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		const workspace = await acceptWorkspaceInvite(
			context.db,
			args.token,
			user.userId,
		);
		return toWorkspaceType(workspace);
	},

	updateWorkspaceMemberRole: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		return updateWorkspaceMemberRole(
			context.db,
			args.input.workspaceId,
			args.input.userId,
			args.input.role.toLowerCase() as "admin" | "editor" | "viewer",
		);
	},

	updateWorkspaceName: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const workspace = await updateWorkspaceName(
			context.db,
			args.input.workspaceId,
			args.input.name,
		);

		return toWorkspaceType(workspace);
	},

	updateWorkspaceSyncOperations: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const workspace = await updateWorkspaceSyncOperationsToProvider(
			context.db,
			args.input.workspaceId,
			args.input.enabled,
		);

		return toWorkspaceType(workspace);
	},

	updateWorkspaceAiSettings: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(
			context.db,
			args.input.workspaceId,
			user.userId,
			["owner", "admin"],
		);

		const settings = await updateWorkspaceAiSettings(
			context.db,
			args.input.workspaceId,
			{
				enabled: args.input.enabled ?? undefined,
				embeddingTier: fromAnalysisModelTier(args.input.embeddingTier),
				ocrTier: fromAnalysisModelTier(args.input.ocrTier),
				maxConcurrency: args.input.maxConcurrency ?? undefined,
				config: args.input.config ?? undefined,
			},
		);

		return toWorkspaceAiSettingsType(settings);
	},

	prepareWorkspaceAiModels: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);

		const settings = await getOrCreateWorkspaceAiSettings(
			context.db,
			args.workspaceId,
		);

		await scheduleModelPreparation(
			context.db,
			args.workspaceId,
			{
				enabled: settings.enabled,
				embeddingTier: settings.embeddingTier,
				ocrTier: settings.ocrTier,
			},
			args.tasks?.map(fromAiModelTask),
		);

		return true;
	},

	startWorkspaceAiProcessing: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);

		const settings = await getOrCreateWorkspaceAiSettings(
			context.db,
			args.workspaceId,
		);

		if (!settings.modelsReady) {
			throw new Error("Models are not ready yet");
		}

		await updateWorkspaceAiSettings(context.db, args.workspaceId, {
			enabled: true,
		});
		await enqueueWorkspaceBackfill(context.db, args.workspaceId);

		return true;
	},

	stopWorkspaceAiProcessing: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);

		await stopWorkspaceAiProcessing(context.db, args.workspaceId);
		return true;
	},

	deleteWorkspaceAiData: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);

		await deleteWorkspaceAiData(context.db, args.workspaceId);
		return true;
	},

	retryWorkspaceAiFailedFiles: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);

		await retryWorkspaceFailedAiFiles(context.db, args.workspaceId);
		return true;
	},

	removeWorkspaceMember: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return removeWorkspaceMember(context.db, args.workspaceId, args.userId);
	},

	revokeWorkspaceInvite: async (_parent, args, context) => {
		const user = requireAuth(context);
		await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
			"owner",
			"admin",
		]);
		return revokeWorkspaceInvite(context.db, args.workspaceId, args.inviteId);
	},
};

export const workspaceResolvers: WorkspaceResolvers = {
	color: (parent) => parent.color.toUpperCase() as never,
};

export const workspaceSubscriptions: SubscriptionResolvers = {
	workspaceAiProgressUpdated: {
		subscribe: async (_parent, args, context) => {
			const user = requireAuth(context);
			await requireWorkspaceRole(context.db, args.workspaceId, user.userId, [
				"owner",
				"admin",
				"editor",
				"viewer",
			]);
			return pubSub.subscribe("workspaceAiProgressUpdated", args.workspaceId);
		},
		resolve: (
			payload: PubSubChannels["workspaceAiProgressUpdated"][1],
		): WorkspaceAiProgressType => toWorkspaceAiProgressType(payload),
	},
};

export const workspaceMemberResolvers: WorkspaceMemberResolvers = {
	role: (parent) => parent.role.toUpperCase() as never,
};

export const workspaceInviteResolvers: WorkspaceInviteResolvers = {
	role: (parent) => parent.role.toUpperCase() as never,
};
