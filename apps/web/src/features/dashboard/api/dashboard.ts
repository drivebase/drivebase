import { graphql } from "@/gql";

export const DASHBOARD_STATS_QUERY = graphql(`
  query GetDashboardStats($workspaceId: ID!) {
    workspaceStats(workspaceId: $workspaceId, days: 1) {
      workspaceId
      totalFiles
      totalSizeBytes
      totalProviders
      bandwidthBytes
    }
  }
`);
