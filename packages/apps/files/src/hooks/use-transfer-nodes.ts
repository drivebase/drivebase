import { useCallback } from "react"
import { useOperationFlow } from "./use-operation-flow"

export function useTransferNodes(onComplete: () => void) {
  const flow = useOperationFlow(onComplete)

  const transferNodes = useCallback(
    (
      srcNodeIds: string[],
      dstProviderId: string,
      dstParentId: string | null,
      deleteSource = false,
    ) => {
      return flow.run({
        transfer: { srcNodeIds, dstProviderId, dstParentId, strategy: "ask", deleteSource },
      })
    },
    [flow],
  )

  return {
    transferNodes,
    pending: flow.pending,
    error: flow.error,
  }
}
