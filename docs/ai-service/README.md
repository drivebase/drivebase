# AI Service Docs

This section documents the **Python inference service** and the API/UI integration around it.

## Files in this folder

- `docs/ai-service/structure.md`: folder and module layout
- `docs/ai-service/flow.md`: end-to-end runtime flow
- `docs/ai-service/syntax-snippets.md`: syntax-only examples (no full implementation)

## Scope

These docs are intentionally implementation-oriented and avoid full code listings.
They provide:

- module boundaries
- request/queue lifecycle
- real-time progress subscription pattern
- model cache paths for dev vs Docker/prod

## Model cache paths

- Dev (default): `./.drivebase/models`
- Docker/prod (recommended): `/app/data/ai-models` on mounted volume

