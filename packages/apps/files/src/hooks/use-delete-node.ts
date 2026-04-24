import { useCallback } from "react"
import { useOperationFlow } from "./use-operation-flow"

/**
 * Batched delete. Accepts one or more node IDs, builds a single `deleteTree`
 * preflight, executes, and fires `onComplete` on the terminal status event.
 */
export function useDeleteNodes(onComplete: () => void) {
  const flow = useOperationFlow(onComplete, { showInTransfers: false })

  const deleteNodes = useCallback(
    (nodeIds: string[]) => {
      return flow.run({ deleteTree: { srcNodeIds: nodeIds } })
    },
    [flow],
  )

  return {
    deleteNodes,
    pending: flow.pending,
    error: flow.error,
  }
}
