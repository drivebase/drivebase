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

export const handleTransfer: Handler = async (ctx) => {
  const { entry, deps, reportProgress, jobId, operationId, conflictDecision } = ctx;
  if (!entry.src?.remoteId) {
    throw new Error("transfer entry missing src.remoteId");
  }
  const src = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: entry.src.providerId,
  });
  const dst = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: entry.dst.providerId,
  });

  const { parentRemoteId, parentId } = await resolveDestinationParent(
    deps,
    entry.dst,
  );

  // Check live against the provider — avoids wasted bandwidth on retry.
  const existing = await checkDestinationExists(dst, parentRemoteId, entry.dst.name);
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

    if (decision === "skip") {
      return { bytes: 0 };
    }
    if (decision === "overwrite") {
      await dst.delete(existing.remoteId);
    }
    if (decision === "rename") {
      const siblings = await fetchSiblingNames(dst, parentRemoteId);
      dstName = autoRename(entry.dst.name, siblings);
      dstPath = `${entry.dst.path.replace(/\/[^/]*$/, "")}/${dstName}`;
    }
  }

  const raw = await src.download(entry.src.remoteId);
  const metered = meterStream(raw, reportProgress);
  const uploaded = await dst.upload({
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
