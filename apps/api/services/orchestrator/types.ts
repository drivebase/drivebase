import type { ConflictStrategy, PlanEntry } from "@drivebase/storage";

export type LocalTreeNode = {
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  clientRef?: string;
  children?: LocalTreeNode[];
};

export type UploadInput = {
  kind: "upload";
  dstProviderId: string;
  dstParentId: string | null;
  tree: LocalTreeNode[];
  strategy: ConflictStrategy;
};

export type TransferInput = {
  kind: "transfer";
  srcNodeIds: string[];
  dstProviderId: string;
  dstParentId: string | null;
  strategy: ConflictStrategy;
  /** When true the worker deletes source nodes after transfer succeeds (move semantics). */
  deleteSource?: boolean;
};

export type CopyTreeInput = {
  kind: "copy_tree";
  srcNodeIds: string[];
  dstParentId: string | null;
  strategy: ConflictStrategy;
};

export type MoveTreeInput = {
  kind: "move_tree";
  srcNodeIds: string[];
  dstParentId: string | null;
  strategy: ConflictStrategy;
};

export type DeleteTreeInput = {
  kind: "delete_tree";
  srcNodeIds: string[];
};

export type PreflightInput =
  | UploadInput
  | TransferInput
  | CopyTreeInput
  | MoveTreeInput
  | DeleteTreeInput;

export type StoredPlan = {
  id: string;
  input: PreflightInput;
  entries: PlanEntry[];
  /** Always empty — kept for backwards compat with stored plans. */
  conflicts: [];
  /** DB node IDs to delete after transfer succeeds (move semantics). */
  deleteSourceNodeIds?: string[];
};
