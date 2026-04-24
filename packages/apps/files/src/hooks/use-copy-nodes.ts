import { useCallback } from "react"
import { useOperationFlow } from "./use-operation-flow"

export function useCopyNodes(onComplete: () => void) {
  const flow = useOperationFlow(onComplete)

  const copyNodes = useCallback(
    (nodeIds: string[], dstParentId: string | null) => {
      return flow.run({
        copyTree: { srcNodeIds: nodeIds, dstParentId, strategy: "ask" },
      })
    },
    [flow],
  )

  return {
    copyNodes,
    pending: flow.pending,
    error: flow.error,
  }
}
