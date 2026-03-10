import { graphql } from "@/gql";

export const ACTIVITIES_PAGE_QUERY = graphql(`
  query ActivitiesPage($page: Int, $limit: Int) {
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

export const CLEAR_ACTIVITIES_MUTATION = graphql(`
  mutation ClearActivitiesPage($ids: [ID!]!) {
    clearActivities(ids: $ids)
  }
`);

export const ACTIVITY_CREATED_SUBSCRIPTION = graphql(`
  subscription ActivityCreatedPage {
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
