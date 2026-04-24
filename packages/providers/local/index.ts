import type { ProviderModule } from "@drivebase/storage";
import { LocalProvider } from "./provider.ts";

export { LocalProvider } from "./provider.ts";

export type LocalCreds = {
  rootDir: string;
};

function assertLocalCreds(raw: unknown): LocalCreds {
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as Record<string, unknown>).rootDir !== "string"
  ) {
    throw new Error("local provider: missing rootDir in credentials");
  }
  return raw as LocalCreds;
}

export const localModule: ProviderModule = {
  type: "local",
  label: "Local filesystem",
  authKind: "none",
  credentialFields: [
    {
      key: "rootDir",
      label: "Root directory",
      type: "text",
      required: true,
      placeholder: "/data/drivebase",
      helpText: "Absolute path on the server filesystem to use as the storage root.",
    },
  ],
  create: ({ credentials }) => {
    const { rootDir } = assertLocalCreds(credentials);
    return new LocalProvider(rootDir);
  },
};
