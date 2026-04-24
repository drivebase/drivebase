import { useCallback } from "react"
import { useOperationFlow } from "./use-operation-flow"

export function useMoveNodes(onComplete: () => void) {
  const flow = useOperationFlow(onComplete)

  const moveNodes = useCallback(
    (nodeIds: string[], dstParentId: string | null) => {
      return flow.run({
        moveTree: { srcNodeIds: nodeIds, dstParentId, strategy: "ask" },
      })
    },
    [flow],
  )

  return {
    moveNodes,
    pending: flow.pending,
    error: flow.error,
  }
}
