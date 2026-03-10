import { graphql } from "@/gql";

export const ACTIVITIES_QUERY = graphql(`
  query GetActivities($page: Int, $limit: Int) {
    activities(page: $page, limit: $limit) {
      nodes {
        id
        kind
        title
        summary
        status
        progress
        details
        userId
        workspaceId
        occurredAt
        createdAt
        user {
          ...UserItem
        }
      }
      meta {
        total
        page
        limit
        totalPages
        hasNextPage
        hasPreviousPage
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

export const RECENT_JOBS_QUERY = graphql(`
  query RecentJobs($limit: Int, $offset: Int) {
    recentJobs(limit: $limit, offset: $offset) {
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
  query RecentActivities($page: Int, $limit: Int) {
    activities(page: $page, limit: $limit) {
      nodes {
        id
        kind
        title
        summary
        status
        progress
        details
        workspaceId
        occurredAt
        createdAt
      }
      meta {
        total
        page
        limit
        totalPages
        hasNextPage
        hasPreviousPage
      }
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

export const CLEAR_ACTIVITIES_MUTATION = graphql(`
  mutation ClearActivities($ids: [ID!]!) {
    clearActivities(ids: $ids)
  }
`);

export const CANCEL_JOB_MUTATION = graphql(`
  mutation CancelJob($jobId: ID!) {
    cancelJob(jobId: $jobId)
  }
`);

export const ACTIVITY_CREATED_SUBSCRIPTION = graphql(`
  subscription ActivityCreated {
    activityCreated {
      id
      kind
      title
      summary
      status
      progress
      details
      workspaceId
      occurredAt
      createdAt
    }
  }
`);
