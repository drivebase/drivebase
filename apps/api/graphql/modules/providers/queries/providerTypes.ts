import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";

export const providerTypes: QueryResolvers["providerTypes"] = async (
  _parent,
  _args,
  ctx,
) => {
  // Actual capabilities live on provider instances; for the catalogue we
  // instantiate each module with a "none" credential purely to read the
  // flags. Providers that require real credentials (S3) return a default
  // capability set from their constructor for this purpose.
  return ctx.registry.list().map((mod) => ({
    type: mod.type,
    label: mod.label,
    authKind: mod.authKind,
    credentialFields: (mod.credentialFields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder ?? null,
      helpText: f.helpText ?? null,
    })),
    // Capabilities are declared at the class level; we just surface a sane
    // default here. Replaced with per-instance flags once connected.
    capabilities: {
      isHierarchical: mod.type !== "s3",
      supportsNativeCopy: true,
      supportsNativeMove: mod.type !== "s3",
      supportsDelta: mod.oauth !== undefined,
      supportsChecksum: true,
      // Only S3-style providers support native multipart + presigning today.
      supportsMultipartUpload: mod.type === "s3",
      supportsPresignedUploadParts: mod.type === "s3",
    },
  }));
};
