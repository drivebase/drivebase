# Smart Search

Smart Search extracts text content from files and enables full-text search across a workspace. It is **disabled by default** and can be toggled per workspace in Settings.

## How It Works

1. **Enable** — When a user enables Smart Search for a workspace, a bulk indexing job is created. It finds all existing files (via their storage providers) and enqueues extraction jobs.

2. **Text Extraction** — Each file is downloaded from its provider, and text is extracted based on MIME type:

   - **Images** — OCR via Tesseract (`tesseract.js`)
   - **PDFs** — Direct text extraction (`pdf-parse`). If the text yield is too low (scanned PDF), pages are converted to images and OCR is applied.
   - **Office documents** — DOCX via `mammoth`, XLSX and PPTX via XML parsing (`jszip`)
   - **Plain text** — Read directly (`.txt`, `.md`, `.csv`, `.json`, `.xml`, etc.)

3. **Storage** — Extracted text is stored in the `file_contents` table alongside a PostgreSQL `tsvector` column. A GIN index on the vector enables efficient full-text search.

4. **Search** — Queries are converted to a prefix `tsquery` (words joined with `&`, each suffixed with `:*`). Results are ranked with `ts_rank` and snippets are generated with `ts_headline`.

5. **Auto-indexing** — When a new file is uploaded to a workspace with Smart Search enabled, extraction is automatically enqueued by the upload worker.

## Database

The feature adds:

- `file_contents` table — stores extracted text, search vector, extraction status, method, word/page counts, and error messages.
- `smart_search_enabled` column on `workspaces` — boolean flag, default `false`.

Extraction status lifecycle: `pending` → `processing` → `completed` | `failed` | `unsupported`.

## Queue & Workers

Extraction runs on a BullMQ queue (`extraction`) with configurable concurrency (default 5). Jobs are deduplicated by file ID. A tracking job (type `smart-search-indexing`) reports bulk progress via the existing PubSub/subscription system so the frontend can show realtime updates in the Job Panel.

## Job Cancellation

Cancellation uses a generic system (not tied to any specific job type):

- A Redis key (`job:cancel:{jobId}`) is set when cancellation is requested.
- Workers check this flag at key points (before download, before extraction) and bail out if set.
- Pending queue jobs are drained when the tracking job is cancelled.
- The same mechanism is used for provider transfer jobs and smart search indexing.

To make a new job type cancellable, add its type string to the `CANCELLABLE_JOB_TYPES` set in the activity resolver and add a queue drain case in `removePendingQueueJobs`.

## Search UI

The command palette (Cmd+K) supports a smart search mode toggled with **Tab** (only visible when Smart Search is enabled for the workspace). In smart mode, search hits show the file name and a highlighted content snippet. Selecting a result opens the same file actions panel as normal search.

## Disabling

When Smart Search is disabled, the `smartSearchEnabled` flag is set to `false`. Extracted data is **kept** in the database so re-enabling doesn't require re-indexing. Search queries are not executed when the feature is disabled.
