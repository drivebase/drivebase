import { useCallback } from "react"
import { useOperationFlow } from "./use-operation-flow"

/**
 * Batched duplicate (copyTree with `rename` strategy). Accepts one or more
 * node IDs and a destination parent. One preflight, one operation.
 */
export function useDuplicateNodes(onComplete: () => void) {
  const flow = useOperationFlow(onComplete)

  const duplicateNodes = useCallback(
    (nodeIds: string[], dstParentId: string | null) => {
      return flow.run({
        copyTree: { srcNodeIds: nodeIds, dstParentId, strategy: "rename" },
      })
    },
    [flow],
  )

  return {
    duplicateNodes,
    pending: flow.pending,
    error: flow.error,
  }
}
