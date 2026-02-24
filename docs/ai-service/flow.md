# Runtime Flow

## 1) User updates AI settings

1. User opens `/settings/ai`
2. User changes tier(s) or enable flag
3. Web calls `updateWorkspaceAiSettings`
4. API persists settings
5. API schedules model preparation job (`ai_model_download`)
6. API polls Python `/models/download/{downloadId}`
7. API pushes job progress through existing `jobUpdated` subscription
8. UI displays live percentage/status

## 2) Upload triggers background analysis

1. File upload completes
2. API enqueues analysis (`analysis-queue`) with dedupe key
3. Analysis worker starts run (`file_analysis_runs` -> `running`)
4. Worker calls Python endpoints per applicable task:
   - `/embed`
   - `/ocr`
   - `/detect-objects`
5. Worker stores structured outputs:
   - `file_embeddings`
   - `file_extracted_text`
   - `file_detected_objects`
6. Worker marks run terminal status (`completed` / `failed` / `skipped`)
7. Worker refreshes workspace progress counters

## 3) Progress calculation

- denominator: **eligible files only**
- excludes unsupported mime and vault-encrypted files
- numerator: files with terminal run state (`completed`, `failed`, `skipped`)

## 4) Search usage

- semantic: embedding similarity
- text: OCR/document extracted text
- object: detected object labels

