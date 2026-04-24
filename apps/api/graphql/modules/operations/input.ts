import type {
  PreflightInput as GqlPreflightInput,
  LocalTreeNodeInput,
} from "~/graphql/__generated__/resolvers.ts";
import type {
  LocalTreeNode,
  PreflightInput,
} from "~/services/orchestrator/types.ts";
import { badInput } from "~/graphql/errors.ts";

/**
 * Unwrap the one-of preflight input. Exactly one field must be set; more
 * than one is ambiguous and rejected. `BigInt` scalars arrive as bigint
 * (per the codegen scalar config) — we coerce to number for internal use.
 */
export function normalizePreflightInput(input: GqlPreflightInput): PreflightInput {
  const set: string[] = [];
  if (input.upload) set.push("upload");
  if (input.transfer) set.push("transfer");
  if (input.copyTree) set.push("copyTree");
  if (input.moveTree) set.push("moveTree");
  if (input.deleteTree) set.push("deleteTree");
  if (set.length !== 1) {
    throw badInput(
      `preflight input must have exactly one of {upload, transfer, copyTree, moveTree, deleteTree}; got ${set.length}`,
    );
  }

  if (input.upload) {
    return {
      kind: "upload",
      dstProviderId: input.upload.dstProviderId,
      dstParentId: input.upload.dstParentId ?? null,
      tree: input.upload.tree.map(normalizeLocalTree),
      strategy: input.upload.strategy,
    };
  }
  if (input.transfer) {
    return {
      kind: "transfer",
      srcNodeIds: requireNonEmpty(input.transfer.srcNodeIds, "transfer"),
      dstProviderId: input.transfer.dstProviderId,
      dstParentId: input.transfer.dstParentId ?? null,
      strategy: input.transfer.strategy,
      deleteSource: input.transfer.deleteSource ?? false,
    };
  }
  if (input.copyTree) {
    return {
      kind: "copy_tree",
      srcNodeIds: requireNonEmpty(input.copyTree.srcNodeIds, "copyTree"),
      dstParentId: input.copyTree.dstParentId ?? null,
      strategy: input.copyTree.strategy,
    };
  }
  if (input.moveTree) {
    return {
      kind: "move_tree",
      srcNodeIds: requireNonEmpty(input.moveTree.srcNodeIds, "moveTree"),
      dstParentId: input.moveTree.dstParentId ?? null,
      strategy: input.moveTree.strategy,
    };
  }
  if (input.deleteTree) {
    return {
      kind: "delete_tree",
      srcNodeIds: requireNonEmpty(input.deleteTree.srcNodeIds, "deleteTree"),
    };
  }
  // Unreachable given the check above, but keeps the type checker happy.
  throw badInput("unreachable");
}

/**
 * GraphQL non-null list types can still send `[]`. The orchestrator's
 * batched paths assume ≥1 source — enforce that at the boundary so
 * downstream code doesn't have to.
 */
function requireNonEmpty(ids: string[], field: string): string[] {
  if (ids.length === 0) {
    throw badInput(`${field}.srcNodeIds must contain at least one id`);
  }
  return ids;
}

function normalizeLocalTree(n: LocalTreeNodeInput): LocalTreeNode {
  return {
    name: n.name,
    type: n.type,
    size: n.size === null || n.size === undefined ? undefined : Number(n.size),
    mimeType: n.mimeType ?? undefined,
    clientRef: n.clientRef ?? undefined,
    children: n.children?.map(normalizeLocalTree),
  };
}
