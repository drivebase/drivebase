import { graphql } from "@/gql";

export const DashboardStatsQuery = graphql(`
  query DashboardStats {
    providers {
      id
      name
      type
      status
      quota {
        totalBytes
        usedBytes
        freeBytes
      }
    }
    bandwidthUsage {
      direction
      totalBytes
      periodStart
      periodEnd
    }
    myUploadBatches {
      id
      status
      totalFiles
      completedFiles
      failedFiles
      totalBytes
      transferredBytes
      createdAt
    }
    myTransferJobs {
      id
      status
      totalFiles
      completedFiles
      failedFiles
      totalBytes
      transferredBytes
      createdAt
    }
  }
`);
