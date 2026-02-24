import { graphql } from "@/gql";

export const ACTIVITIES_QUERY = graphql(`
  query GetActivities($limit: Int, $offset: Int) {
    activities(limit: $limit, offset: $offset) {
      id
      type
      userId
      metadata
      ipAddress
      userAgent
      createdAt
      user {
        ...UserItem
      }
      file {
        ...FileItem
      }
      folder {
        ...FolderItem
      }
      provider {
        id
        name
        type
      }
    }
  }
`);

export const ACTIVE_JOBS_QUERY = graphql(`
  query ActiveJobs {
    activeJobs {
      id
      type
      title
      message
      progress
      status
      metadata
      createdAt
      updatedAt
    }
  }
`);

export const RECENT_ACTIVITIES_QUERY = graphql(`
  query RecentActivities($limit: Int, $offset: Int) {
    activities(limit: $limit, offset: $offset) {
      id
      type
      fileId
      folderId
      providerId
      metadata
      createdAt
    }
  }
`);

export const JOB_UPDATED_SUBSCRIPTION = graphql(`
  subscription JobUpdated {
    jobUpdated {
      id
      type
      title
      message
      progress
      status
      metadata
      createdAt
      updatedAt
    }
  }
`);

export const CANCEL_TRANSFER_JOB_MUTATION = graphql(`
  mutation CancelTransferJob($jobId: ID!) {
    cancelTransferJob(jobId: $jobId)
  }
`);
