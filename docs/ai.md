# AI Pipeline — End-to-End Flow

This document describes the current AI architecture and runtime flow in Drivebase: settings, model preparation, background processing, indexing, and AI search.

---

## High-Level Architecture

Components:

1. API (GraphQL + queue orchestration)
- Stores workspace AI settings/progress.
- Enqueues file analysis jobs.
- Runs BullMQ worker for background analysis.
- Persists AI outputs in Postgres.

2. AI inference service (`services/ai-inference`)
- Exposes inference endpoints (`/embed*`, `/ocr*`, `/detect-objects*`, `/models/*`).
- Handles model download/ready lifecycle.
- Performs text extraction and object detection for streamed files.

3. Data stores
- Postgres (AI run metadata + extracted/searchable artifacts)
- Redis (BullMQ queue state)
- Model storage volume (`AI_MODELS_DIR`) for downloaded model assets

---

## AI Feature Types

Current top-level features (configurable per workspace):

1. `embedding`
- File/query/chunk vector generation for semantic ranking.

2. `ocr`
- Text extraction from PDFs, images, txt/json/csv, and docx.

3. `objectDetection`
- Object labels from images.

These are stored in `workspace_ai_settings.config.aiFeatures` and applied at enqueue/worker/search time.

---

## Workspace Settings Flow

GraphQL settings objects:

- `workspaceAiSettings`
  - `enabled`
  - `modelsReady`
  - `embeddingTier`, `ocrTier`, `objectTier`
  - `maxConcurrency`
  - `config` (JSON, includes feature toggles)

- `workspaceAiProgress`
  - `eligibleFiles`, `processedFiles`, `pendingFiles`, `runningFiles`, `failedFiles`, `skippedFiles`, `completedFiles`, `completionPct`

Realtime updates are pushed via subscription:
- `workspaceAiProgressUpdated(workspaceId)`

---

## Model Preparation Flow

1. User selects tiers per category in AI Models section.
2. User clicks download per category.
3. API persists selected tiers and calls `prepareWorkspaceAiModels`.
4. API calls inference `/models/ensure` for required tasks.
5. Inference service downloads (or simulates/marks) models and reports progress.
6. API writes job/activity updates and eventually marks workspace models ready.

Model path behavior:
- Inference models are stored under `AI_MODELS_DIR`.
- YOLO object-detection weights are forced to `AI_MODELS_DIR/yolo`.

---

## Background Analysis Flow

### Trigger paths

- Manual start: `startWorkspaceAiProcessing`
- Workspace backfill enqueue
- Upload/provider sync paths
- Retry failed files: `retryWorkspaceAiFailedFiles`

### Enqueue (`analysis-jobs.ts`)

For each file:

1. Validate file belongs to workspace and is not deleted.
2. Check workspace AI enabled.
3. Check `maxFileSizeMb` (config/env).
4. Check eligible MIME type.
5. Check feature toggles:
- if all disabled, skip enqueue (`all_features_disabled`).
6. Create `analysisKey` for dedupe.
7. Insert run in `file_analysis_runs`.
8. Enqueue BullMQ job `file-analysis`.

### Worker (`analysis-worker.ts`)

For each queued run:

1. Set run to `running`.
2. Load workspace settings + feature toggles.
3. For each task:

- Embedding
  - skipped if `embedding=false`
  - otherwise calls inference `/embed/stream`
  - writes to `file_embeddings`

- OCR / extraction
  - skipped if `ocr=false`
  - otherwise calls inference `/ocr/stream`
  - writes full text to `file_extracted_text`
  - chunks text and writes embeddings to `file_text_chunks`

- Object detection
  - skipped if `objectDetection=false`
  - image-only
  - calls inference `/detect-objects/stream`
  - writes labels to `file_detected_objects`

4. Aggregate statuses -> final run state (`completed`/`failed`/`skipped`).
5. Refresh workspace progress and publish subscription event.

---

## Inference Service Flow

### Endpoints

- `POST /embed`, `POST /embed-text`, `POST /embed/stream`
- `POST /ocr`, `POST /ocr/stream`
- `POST /detect-objects`, `POST /detect-objects/stream`
- `POST /models/ensure`
- `GET /models/download/{downloadId}`
- `GET /health`

### OCR/extraction routing (`ocr/stream`)

Input: streamed file bytes + headers (`x-file-name`, `x-mime-type`, `x-model-tier`).

Routing:

1. PDF
- Native text extract (`pypdf`)
- Fallback: render pages (`pdf2image`) + OCR (`pytesseract`)
- source: `pdf_text` or `pdf_ocr`

2. DOCX
- `python-docx`
- source: `docx_text`

3. text/json/csv
- decode bytes
- source: `plain_text`

4. image/*
- OCR via `pytesseract`
- source: `ocr_image`

### Object detection (`detect-objects/stream`)

- image/* only
- runs YOLO by selected tier
- writes normalized labels (e.g. `person`, `cat`, `dog`) with confidence and bbox

---

## AI Search Flow (`searchFilesAi`)

1. Detect intent from query:
- image-intent words (image/photo/person/woman/man/etc.)
- document-intent words (pdf/doc/report/etc.)

2. Build candidate pool from:
- semantic file embeddings
- semantic chunk embeddings
- lexical filename matches
- lexical extracted text matches
- lexical detected object labels

3. Rank hybrid score with lexical/semantic gates.

4. If semantic path unavailable or weak:
- lexical fallback query across filename + extracted text + object labels.

5. Feature-aware behavior:
- if `embedding=false`, uses lexical fallback path directly.

---

## Database AI Artifacts

Core tables:

- `workspace_ai_settings`
- `workspace_ai_progress`
- `file_analysis_runs`
- `file_embeddings`
- `file_extracted_text`
- `file_text_chunks`
- `file_detected_objects`

---

## Failure Handling

Common skip/fail reasons:

- `ai_processing_disabled`
- `all_features_disabled`
- `unsupported_file_type`
- `file_too_large`
- `inference_service_not_configured`
- `file_not_found`
- `feature_disabled`

Inference-specific dependency errors:

- `missing_system_dependency:tesseract`
- `missing_system_dependency:poppler`
- `missing_pdf_ocr_dependency:pdf2image+pytesseract`
- `missing_object_detection_dependency:ultralytics`

---

## Runtime Dependencies

Inference Python packages:

- `fastapi`, `uvicorn`, `requests`
- `pypdf`, `pdf2image`
- `python-docx`
- `Pillow`, `pytesseract`
- `ultralytics`

System packages required in container/host:

- `tesseract-ocr`
- `poppler-utils`
- plus vision runtime libs used by model stack

Docker:

- `services/ai-inference/Dockerfile` installs required system packages.
- `compose.yaml` builds `ai-inference` from that Dockerfile.

---

## Operational Checklist

After changing AI extraction/inference logic:

1. Rebuild/restart inference service.
2. Ensure model volume is mounted and writable.
3. Confirm `tesseract` and `pdfinfo` available in runtime.
4. Reprocess workspace files (or retry failed runs).
5. Validate rows in:
- `file_extracted_text`
- `file_text_chunks`
- `file_detected_objects`

