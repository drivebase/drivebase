import { useSubscription } from "urql"
import {
  OperationProgressDocument,
  type OperationProgressSubscription,
  type OperationProgressSubscriptionVariables,
} from "../gql"

export type OperationProgressEvent =
  OperationProgressSubscription["operationProgress"]

export type ConflictRecord = {
  conflictId: string
  jobId: string
  path: string
  existingType: string
  incomingType: string
}

type ProgressState = {
  event: OperationProgressEvent | null
  conflicts: ConflictRecord[]
}

/**
 * Live progress stream for a single operation. Emits ProgressEvent /
 * JobStatusEvent / OperationStatusEvent until the operation hits a
 * terminal state, then the stream closes. Pass `operationId: null` to
 * pause (e.g., before the mutation that produced the operation resolves).
 *
 * ConflictDiscoveredEvents are accumulated in `conflicts` via the urql
 * reducer rather than surfaced as a plain `event`. This ensures that when
 * multiple conflict events arrive in rapid succession (workers run with
 * concurrency > 1), React 18 automatic batching cannot drop intermediate
 * events — the reducer runs synchronously per-event before any render.
 */
export function useOperationProgress(operationId: string | null) {
  const [result] = useSubscription<
    OperationProgressSubscription,
    ProgressState,
    OperationProgressSubscriptionVariables
  >(
    {
      query: OperationProgressDocument,
      variables: operationId
        ? { operationId }
        : ({ operationId: "" } as OperationProgressSubscriptionVariables),
      pause: !operationId,
    },
    (prev: ProgressState | undefined, next: OperationProgressSubscription): ProgressState => {
      const incoming = next.operationProgress
      const existingConflicts = prev?.conflicts ?? []

      if (incoming.__typename === "ConflictDiscoveredEvent") {
        // Deduplicate — server replay may re-send if client reconnects mid-op
        if (existingConflicts.some((c) => c.conflictId === incoming.conflictId)) {
          return prev ?? { event: null, conflicts: [] }
        }
        return {
          event: prev?.event ?? null,
          conflicts: [
            ...existingConflicts,
            {
              conflictId: incoming.conflictId,
              jobId: incoming.jobId,
              path: incoming.path,
              existingType: incoming.existingType,
              incomingType: incoming.incomingType,
            },
          ],
        }
      }

      return { event: incoming, conflicts: existingConflicts }
    },
  )
  return {
    event: result.data?.event ?? null,
    conflicts: result.data?.conflicts ?? [],
    error: result.error,
    stale: result.stale,
  }
}
