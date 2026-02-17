import { useMutation, useQuery } from "urql";
import {
	CREATE_WORKSPACE_MUTATION,
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
