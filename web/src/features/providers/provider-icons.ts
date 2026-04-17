import { ProviderType } from "@/gql/graphql";

export const PROVIDER_ICON_CLASSES: Record<ProviderType, string> = {
  [ProviderType.GoogleDrive]: "icon-[logos--google-drive]",
  [ProviderType.S3]: "icon-[logos--aws-s3]",
  [ProviderType.Local]: "icon-[logos--linux-tux]",
};

export const PROVIDER_COLORS: Record<ProviderType, string> = {
  [ProviderType.S3]: "bg-orange-500/10",
  [ProviderType.GoogleDrive]: "bg-blue-500/10",
  [ProviderType.Local]: "bg-green-500/10",
};
