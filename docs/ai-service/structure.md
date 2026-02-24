# Working Structure

## High-level tree

```text
services/
  ai-inference/
    app.py                 # FastAPI entrypoint
    requirements.txt       # Python deps
    README.md              # local run and env notes

apps/
  api/
    services/ai/
      inference-client.ts  # HTTP client to ai-inference service
      model-download.ts    # model ensure + polling + job progress updates
      ai-settings.ts       # settings + progress aggregation
      analysis-jobs.ts     # enqueue/skip/dedupe logic

    queue/
      analysis-queue.ts    # BullMQ queue definition
      analysis-worker.ts   # background file analysis worker

  web/
    src/features/settings/
      AiSettingsView.tsx   # /settings/ai page

    src/features/workspaces/
      api/workspace.ts     # AI settings/progress GraphQL ops
      hooks/useWorkspaces.ts
```

## Responsibility split

- `ai-inference` (Python): model lifecycle + infer endpoints
- `apps/api` (Bun): orchestration, retries, DB writes, subscriptions
- `apps/web` (React): settings controls + progress UI

## Why this split

- keeps heavy ML runtime out of API process
- allows independent scaling for inference workers
- keeps web app pure GraphQL consumer

