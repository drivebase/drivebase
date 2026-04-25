import type { Resolvers } from "~/graphql/__generated__/resolvers.ts";

const UPDATER_URL = Bun.env.UPDATER_URL ?? "http://updater:4500";
const UPDATER_SECRET = Bun.env.UPDATER_SECRET;

function updaterHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (UPDATER_SECRET) headers["Authorization"] = `Bearer ${UPDATER_SECRET}`;
  return headers;
}

type UpdateStatusPayload = {
  status: string;
  message: string | null;
  currentVersion: string | null;
  targetVersion: string | null;
};

const errorStatus = (message: string): UpdateStatusPayload => ({
  status: "error",
  message,
  currentVersion: null,
  targetVersion: null,
});

export const resolvers: Resolvers = {
  Query: {
    appMetadata: async () => {
      if (Bun.env.APP_VERSION) return { version: Bun.env.APP_VERSION };
      try {
        const pkg = await Bun.file(new URL("../../../../package.json", import.meta.url)).json() as { version?: string };
        return { version: pkg.version ?? "0.0.0" };
      } catch {
        return { version: "0.0.0" };
      }
    },

    updateStatus: async () => {
      try {
        const res = await fetch(`${UPDATER_URL}/status`, { headers: updaterHeaders() });
        if (!res.ok) return errorStatus(`Updater returned ${res.status}`);
        return res.json() as Promise<UpdateStatusPayload>;
      } catch {
        return errorStatus("Updater is not reachable");
      }
    },
  },

  Mutation: {
    triggerAppUpdate: async (_parent, args) => {
      try {
        const body: Record<string, string> = {};
        if (args.version) body.targetVersion = args.version;

        const res = await fetch(`${UPDATER_URL}/update`, {
          method: "POST",
          headers: updaterHeaders(),
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string; status?: string; message?: string };
          return errorStatus(data.error ?? data.message ?? `HTTP ${res.status}`);
        }

        return res.json() as Promise<UpdateStatusPayload>;
      } catch {
        return errorStatus("Updater is not reachable");
      }
    },
  },
};
