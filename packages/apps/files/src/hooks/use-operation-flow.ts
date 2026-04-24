import { useCallback, useEffect, useRef, useState } from "react"
import {
  useCancelOperation,
  useExecutePlan,
  useOperationProgress,
  usePreflight,
} from "@drivebase/data"
import { useBus } from "@drivebase/kernel/bus"
import type { PreflightInput } from "@drivebase/data/gql"

/**
 * Generic preflight → executePlan → progress flow.
 *
 * Call `run(input)` to start. Conflicts are discovered at runtime by workers
 * and surfaced in the TransferPanel — there is no preflight-level conflict UI.
 * On any terminal `operationProgress` event `onComplete` fires and the hook resets.
 *
 * Emits `transfer.start` on the kernel bus after executePlan so the
 * TransferPanel can open and track progress automatically.
 */
export function useOperationFlow(
  onComplete: (status: "succeeded" | "failed" | "cancelled") => void,
  options?: { showInTransfers?: boolean },
) {
  const [, preflight] = usePreflight()
  const [, executePlan] = useExecutePlan()
  const [, cancelOperation] = useCancelOperation()
  const [operationId, setOperationId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bus = useBus()
  const { event } = useOperationProgress(operationId)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!event) return
    if (event.__typename === "OperationStatusEvent") {
      const status = event.lifecycleStatus as "succeeded" | "failed" | "cancelled"
      if (status !== "succeeded") {
        setError(`Operation ${status}`)
      }
      setOperationId(null)
      setPending(false)
      onCompleteRef.current(status)
    }
  }, [event])

  const executeId = useCallback(
    async (opId: string) => {
      const exec = await executePlan({ operationId: opId })
      if (exec.error) {
        setPending(false)
        setError(exec.error.message)
        return
      }
      setOperationId(opId)
      if (options?.showInTransfers ?? true) {
        bus.emit("transfer.start", { operationId: opId })
      }
    },
    [executePlan, bus, options?.showInTransfers],
  )

  const run = useCallback(
    async (input: PreflightInput) => {
      setError(null)
      setPending(true)
      const pf = await preflight({ input })
      if (pf.error || !pf.data) {
        setPending(false)
        setError(pf.error?.message ?? "Preflight failed")
        return
      }
      const plan = pf.data.preflight
      if (plan.status !== "ready") {
        setPending(false)
        setError(`Plan status: ${plan.status}`)
        return
      }
      await executeId(plan.operationId)
    },
    [preflight, executeId],
  )

  const cancel = useCallback(async () => {
    if (!operationId) return
    setOperationId(null)
    setPending(false)
    await cancelOperation({ operationId })
  }, [operationId, cancelOperation])

  return { run, pending, error, cancel }
}
