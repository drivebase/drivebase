import { meterStream } from "@drivebase/storage";
import type { Handler } from "../runtime/handler.ts";
import {
  resolveDestinationParent,
  upsertMaterializedNode,
} from "../runtime/destination.ts";
import { getProvider } from "../runtime/providers.ts";
import { invalidateEntryCache } from "../runtime/invalidate.ts";
import {
  checkDestinationExists,
  resolveConflictDecision,
  autoRename,
  fetchSiblingNames,
} from "../runtime/conflict.ts";

export const handleCopy: Handler = async (ctx) => {
  const { entry, deps, reportProgress, jobId, operationId, conflictDecision } = ctx;
  if (!entry.src?.remoteId) {
    throw new Error("copy entry missing src.remoteId");
  }
  const provider = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: entry.src.providerId,
  });
  const { parentRemoteId, parentId } = await resolveDestinationParent(
    deps,
    entry.dst,
  );

  const existing = await checkDestinationExists(provider, parentRemoteId, entry.dst.name);
  let dstName = entry.dst.name;
  let dstPath = entry.dst.path;

  if (existing) {
    const decision = await resolveConflictDecision({
      deps,
      jobId,
      operationId,
      path: entry.dst.path,
      existingType: existing.type,
      incomingType: "file",
      jobDecision: conflictDecision,
    });

    if (decision === "skip") return { bytes: 0 };
    if (decision === "overwrite") await provider.delete(existing.remoteId);
    if (decision === "rename") {
      const siblings = await fetchSiblingNames(provider, parentRemoteId);
      dstName = autoRename(entry.dst.name, siblings);
      dstPath = `${entry.dst.path.replace(/\/[^/]*$/, "")}/${dstName}`;
    }
  }

  if (provider.capabilities.supportsNativeCopy) {
    const copied = await provider.copy(entry.src.remoteId, parentRemoteId, dstName);
    await upsertMaterializedNode({
      deps,
      providerId: entry.dst.providerId,
      parentId,
      pathText: dstPath,
      node: copied,
    });
    await invalidateEntryCache(deps, entry);
    return { bytes: entry.size ?? 0 };
  }

  const raw = await provider.download(entry.src.remoteId);
  const metered = meterStream(raw, reportProgress);
  const uploaded = await provider.upload({
    parentRemoteId,
    name: dstName,
    stream: metered,
    size: entry.size,
  });
  await upsertMaterializedNode({
    deps,
    providerId: entry.dst.providerId,
    parentId,
    pathText: dstPath,
    node: uploaded,
  });
  await invalidateEntryCache(deps, entry);
  return { bytes: uploaded.size ?? entry.size ?? 0 };
};
