import { useMutation, useQuery } from "urql";
import {
	ACCEPT_WORKSPACE_INVITE_MUTATION,
	CREATE_WORKSPACE_INVITE_MUTATION,
	CREATE_WORKSPACE_MUTATION,
	DELETE_WORKSPACE_AI_DATA_MUTATION,
	PREPARE_WORKSPACE_AI_MODELS_MUTATION,
	REMOVE_WORKSPACE_MEMBER_MUTATION,
	REVOKE_WORKSPACE_INVITE_MUTATION,
	START_WORKSPACE_AI_PROCESSING_MUTATION,
	STOP_WORKSPACE_AI_PROCESSING_MUTATION,
	UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION,
	UPDATE_WORKSPACE_NAME_MUTATION,
	UPDATE_WORKSPACE_AI_SETTINGS_MUTATION,
	UPDATE_WORKSPACE_SYNC_OPERATIONS_MUTATION,
	WORKSPACE_AI_PROGRESS_QUERY,
	WORKSPACE_AI_SETTINGS_QUERY,
	WORKSPACE_INVITES_QUERY,
	WORKSPACE_MEMBERS_QUERY,
	WORKSPACES_QUERY,
} from "@/features/workspaces/api/workspace";

export function useWorkspaces(pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: WORKSPACES_QUERY,
		pause,
	});

	return [result, reexecuteQuery] as const;
}

export function useCreateWorkspace() {
	const [result, execute] = useMutation(CREATE_WORKSPACE_MUTATION);
	return [result, execute] as const;
}

export function useWorkspaceMembers(workspaceId: string, pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: WORKSPACE_MEMBERS_QUERY,
		variables: { workspaceId },
		pause,
	});

	return [result, reexecuteQuery] as const;
}

export function useWorkspaceInvites(workspaceId: string, pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: WORKSPACE_INVITES_QUERY,
		variables: { workspaceId },
		pause,
	});

	return [result, reexecuteQuery] as const;
}

export function useCreateWorkspaceInvite() {
	const [result, execute] = useMutation(CREATE_WORKSPACE_INVITE_MUTATION);
	return [result, execute] as const;
}

export function useUpdateWorkspaceMemberRole() {
	const [result, execute] = useMutation(UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION);
	return [result, execute] as const;
}

export function useUpdateWorkspaceName() {
	const [result, execute] = useMutation(UPDATE_WORKSPACE_NAME_MUTATION);
	return [result, execute] as const;
}

export function useUpdateWorkspaceSyncOperations() {
	const [result, execute] = useMutation(
		UPDATE_WORKSPACE_SYNC_OPERATIONS_MUTATION,
	);
	return [result, execute] as const;
}

export function useWorkspaceAiSettings(workspaceId: string, pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: WORKSPACE_AI_SETTINGS_QUERY,
		variables: { workspaceId },
		pause,
	});

	return [result, reexecuteQuery] as const;
}

export function useWorkspaceAiProgress(workspaceId: string, pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: WORKSPACE_AI_PROGRESS_QUERY,
		variables: { workspaceId },
		pause,
	});

	return [result, reexecuteQuery] as const;
}

export function useUpdateWorkspaceAiSettings() {
	const [result, execute] = useMutation(UPDATE_WORKSPACE_AI_SETTINGS_MUTATION);
	return [result, execute] as const;
}

export function usePrepareWorkspaceAiModels() {
	const [result, execute] = useMutation(PREPARE_WORKSPACE_AI_MODELS_MUTATION);
	return [result, execute] as const;
}

export function useStartWorkspaceAiProcessing() {
	const [result, execute] = useMutation(START_WORKSPACE_AI_PROCESSING_MUTATION);
	return [result, execute] as const;
}

export function useStopWorkspaceAiProcessing() {
	const [result, execute] = useMutation(STOP_WORKSPACE_AI_PROCESSING_MUTATION);
	return [result, execute] as const;
}

export function useDeleteWorkspaceAiData() {
	const [result, execute] = useMutation(DELETE_WORKSPACE_AI_DATA_MUTATION);
	return [result, execute] as const;
}

export function useRemoveWorkspaceMember() {
	const [result, execute] = useMutation(REMOVE_WORKSPACE_MEMBER_MUTATION);
	return [result, execute] as const;
}

export function useRevokeWorkspaceInvite() {
	const [result, execute] = useMutation(REVOKE_WORKSPACE_INVITE_MUTATION);
	return [result, execute] as const;
}

export function useAcceptWorkspaceInvite() {
	const [result, execute] = useMutation(ACCEPT_WORKSPACE_INVITE_MUTATION);
	return [result, execute] as const;
}
