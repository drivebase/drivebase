import { graphql } from "@/gql";

export const APP_METADATA_QUERY = graphql(`
  query GetAppMetadata {
    appMetadata {
      version
    }
  }
`);

export const UPDATE_STATUS_QUERY = graphql(`
  query GetUpdateStatus {
    updateStatus {
      status
      message
      currentVersion
      targetVersion
    }
  }
`);

export const TRIGGER_APP_UPDATE_MUTATION = graphql(`
  mutation TriggerAppUpdate($version: String) {
    triggerAppUpdate(version: $version) {
      status
      message
      currentVersion
      targetVersion
    }
  }
`);
