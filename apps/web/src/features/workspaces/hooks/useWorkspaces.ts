import { useQuery } from "urql";
import { WORKSPACES_QUERY } from "@/features/workspaces/api/workspace";

export function useWorkspaces(pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: WORKSPACES_QUERY,
		pause,
	});

	return [result, reexecuteQuery] as const;
}
