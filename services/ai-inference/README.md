# AI Inference Service

Minimal Python service used by the API for:

- semantic embedding generation
- OCR text extraction
- object detection
- model download/prepare tracking

## Run locally

```bash
cd services/ai-inference
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8010 --reload
```

## Environment

- `AI_MODELS_DIR`:
  - Dev default: `./.drivebase/models` (relative to current working dir)
  - Recommended Docker/prod: `/app/data/ai-models` (mounted volume)
- `AI_MODEL_ASSET_URLS`:
  - Optional JSON map of model ID to downloadable asset URL.
  - Example:
    ```json
    {"CLIP-ViT-B-32":"https://example.com/clip.bin"}
    ```

## API endpoints

- `POST /models/ensure`
- `GET /models/download/{downloadId}`
- `POST /embed`
- `POST /ocr`
- `POST /detect-objects`
- `GET /health`
