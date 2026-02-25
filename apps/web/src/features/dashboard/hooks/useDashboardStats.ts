import { useQuery } from "urql";
import { DASHBOARD_STATS_QUERY } from "@/features/dashboard/api/dashboard";

export function useDashboardStats(workspaceId: string, pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: DASHBOARD_STATS_QUERY,
		variables: { workspaceId },
		pause,
		requestPolicy: "cache-and-network",
	});

	return [result, reexecuteQuery] as const;
}
