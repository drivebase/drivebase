import { ConflictError, type RemoteNode } from "@drivebase/storage";
import type { Handler } from "../runtime/handler.ts";
import {
  resolveDestinationParent,
  upsertMaterializedNode,
} from "../runtime/destination.ts";
import { getProvider } from "../runtime/providers.ts";
import { invalidateEntryCache } from "../runtime/invalidate.ts";


/**
 * Create a folder on the destination provider. Idempotent: if a folder with
 * the same name already exists at the destination we reuse it (merge semantics)
 * rather than creating a duplicate. Providers that allow duplicate names (e.g.
 * Google Drive) would otherwise silently create a second folder.
 *
 * Flow:
 *   1. List the parent's direct children and look for a name match.
 *   2. Found → upsert the existing node and return early.
 *   3. Not found → createFolder. If a ConflictError is thrown despite step 1
 *      (race between two parallel workers), do a second lookup and upsert.
 */
export const handleCreateFolder: Handler = async (ctx) => {
  const { entry, deps } = ctx;
  const provider = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: entry.dst.providerId,
  });
  const { parentRemoteId, parentId } = await resolveDestinationParent(
    deps,
    entry.dst,
  );

  // Live-check the parent before creating — avoids duplicate folders on
  // providers (like Google Drive) that don't enforce name uniqueness.
  const siblings = await fetchSiblingNodes(provider, parentRemoteId);
  const existing = siblings.find(
    (n) => n.name === entry.dst.name && n.type === "folder",
  );

  if (existing) {
    await upsertMaterializedNode({
      deps,
      providerId: entry.dst.providerId,
      parentId,
      pathText: entry.dst.path,
      node: existing,
    });
    await invalidateEntryCache(deps, entry);
    return { bytes: 0 };
  }

  try {
    const created = await provider.createFolder(parentRemoteId, entry.dst.name);
    await upsertMaterializedNode({
      deps,
      providerId: entry.dst.providerId,
      parentId,
      pathText: entry.dst.path,
      node: created,
    });
  } catch (err) {
    if (!(err instanceof ConflictError)) throw err;

    // Race: another worker created the folder between our list and create.
    // Re-fetch from provider to get the remoteId.
    const { nodes } = await provider.listChildren(parentRemoteId ?? null);
    const raced = nodes.find(
      (n) => n.name === entry.dst.name && n.type === "folder",
    );
    if (!raced) {
      throw new Error(
        `createFolder conflict but folder "${entry.dst.name}" not found after retry`,
      );
    }
    await upsertMaterializedNode({
      deps,
      providerId: entry.dst.providerId,
      parentId,
      pathText: entry.dst.path,
      node: raced,
    });
  }

  await invalidateEntryCache(deps, entry);
  return { bytes: 0 };
};

async function fetchSiblingNodes(
  provider: { listChildren(parentRemoteId: string | null, pageToken?: string): Promise<{ nodes: RemoteNode[]; nextPageToken?: string }> },
  parentRemoteId: string | null,
): Promise<RemoteNode[]> {
  const all: RemoteNode[] = [];
  let pageToken: string | undefined;
  do {
    const page = await provider.listChildren(parentRemoteId, pageToken);
    all.push(...page.nodes);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return all;
}
