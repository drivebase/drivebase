# Syntax Snippets (Not Full Code)

## Python (FastAPI) endpoint shapes

```py
@app.post("/models/ensure")
def ensure_model(payload: EnsureModelRequest) -> EnsureModelResponse: ...

@app.get("/models/download/{download_id}")
def download_status(download_id: str): ...

@app.post("/embed")
def embed(payload: EmbedRequest) -> EmbedResponse: ...

@app.post("/ocr")
def ocr(payload: OcrRequest) -> OcrResponse: ...

@app.post("/detect-objects")
def detect_objects(payload: DetectObjectsRequest) -> DetectObjectsResponse: ...
```

## API queue + worker shapes

```ts
// queue
export interface FileAnalysisJobData {
  runId: string;
  workspaceId: string;
  fileId: string;
}

export function getAnalysisQueue(): Queue<FileAnalysisJobData> { ... }

// worker
export function startAnalysisWorker(): Worker<FileAnalysisJobData> { ... }
```

## API inference client shape

```ts
export async function ensureModel(input: {
  task: "embedding" | "ocr" | "object_detection";
  tier: "lightweight" | "medium" | "heavy";
}): Promise<EnsureModelResponse> { ... }

export async function getModelDownloadStatus(downloadId: string): Promise<ModelDownloadStatusResponse> { ... }
```

## Frontend subscription syntax (urql)

```ts
const JOB_UPDATED_SUBSCRIPTION = graphql(`
  subscription JobUpdated {
    jobUpdated {
      id
      type
      title
      message
      progress
      status
      metadata
      createdAt
      updatedAt
    }
  }
`);

const [{ data: jobUpdatedData }] = useSubscription({
  query: JOB_UPDATED_SUBSCRIPTION,
  pause: !workspaceId,
});
```

## Frontend filter for model job

```ts
const modelJob = useMemo(() => {
  const job = jobUpdatedData?.jobUpdated;
  if (!job) return null;
  if (job.type !== "ai_model_download") return null;
  if (job.metadata?.workspaceId !== workspaceId) return null;
  return {
    ...job,
    percent: Math.round(job.progress * 100),
  };
}, [jobUpdatedData, workspaceId]);
```

## Cache path defaults

```bash
# Dev
AI_MODELS_DIR=./.drivebase/models

# Docker/prod (mounted volume)
AI_MODELS_DIR=/app/data/ai-models
```

