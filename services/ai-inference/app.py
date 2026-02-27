from __future__ import annotations

import hashlib
import logging

from ai_inference.config import MODEL_REGISTRY, MODELS_DIR, TaskType, TierType
from ai_inference.downloads import ensure_download, get_download_status, is_model_ready
from ai_inference.embeddings import embedding_from_seed
from ai_inference.extractors import extract_text_for_file
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel


class EnsureModelRequest(BaseModel):
    task: TaskType
    tier: TierType


class EnsureModelResponse(BaseModel):
    downloadId: str
    modelId: str
    status: str
    progress: float
    message: str


class EmbedRequest(BaseModel):
    fileId: str
    fileName: str
    mimeType: str
    modelTier: TierType


class EmbedResponse(BaseModel):
    embedding: list[float]
    modelName: str


class EmbedTextRequest(BaseModel):
    text: str
    modelTier: TierType = "medium"


class OcrRequest(BaseModel):
    fileId: str
    fileName: str
    mimeType: str
    modelTier: TierType


class OcrResponse(BaseModel):
    text: str
    language: str | None = None
    source: str | None = None


app = FastAPI(title="Drivebase AI Inference Service", version="3.1.0")
logger = logging.getLogger("drivebase.ai_inference")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _resolve_tier(value: str | None) -> TierType:
    if value == "lightweight":
        return "lightweight"
    if value == "heavy":
        return "heavy"
    return "medium"


@app.get("/health")
def health():
    logger.info("Health check")
    return {"ok": True, "modelsDir": str(MODELS_DIR)}


@app.post("/models/ensure", response_model=EnsureModelResponse)
def ensure_model(payload: EnsureModelRequest):
    logger.info("Ensure model requested task=%s tier=%s", payload.task, payload.tier)
    model_id = MODEL_REGISTRY[payload.tier][payload.task]
    entry = ensure_download(model_id)
    return EnsureModelResponse(
        downloadId=entry.download_id,
        modelId=entry.model_id,
        status=entry.status,
        progress=entry.progress,
        message=entry.message,
    )


@app.get("/models/download/{download_id}")
def download_status(download_id: str):
    try:
        return get_download_status(download_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Download not found")


@app.get("/models/ready")
def model_ready(task: TaskType, tier: TierType):
    model_id = MODEL_REGISTRY[tier][task]
    return {
        "task": task,
        "tier": tier,
        "modelId": model_id,
        "ready": is_model_ready(model_id),
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(payload: EmbedRequest):
    logger.info("Embed requested file=%s tier=%s", payload.fileId, payload.modelTier)
    model_name = MODEL_REGISTRY[payload.modelTier]["embedding"]
    seed = f"{payload.fileId}|{payload.fileName}|{payload.mimeType}|{model_name}"
    return EmbedResponse(embedding=embedding_from_seed(seed), modelName=model_name)


@app.post("/embed-text", response_model=EmbedResponse)
def embed_text(payload: EmbedTextRequest):
    model_name = MODEL_REGISTRY[payload.modelTier]["embedding"]
    logger.info("Embed text requested tier=%s chars=%s", payload.modelTier, len(payload.text))
    seed = f"{payload.text}|{model_name}"
    return EmbedResponse(embedding=embedding_from_seed(seed), modelName=model_name)


@app.post("/embed/stream", response_model=EmbedResponse)
async def embed_stream(request: Request):
    file_name = request.headers.get("x-file-name", "unknown")
    mime_type = request.headers.get("x-mime-type", "application/octet-stream")
    tier = _resolve_tier(request.headers.get("x-model-tier"))
    model_name = MODEL_REGISTRY[tier]["embedding"]
    body = await request.body()
    logger.info(
        "Embed stream requested file=%s tier=%s bytes=%s",
        file_name,
        tier,
        len(body),
    )
    digest = hashlib.sha256(body).hexdigest()
    seed = f"{file_name}|{mime_type}|{model_name}|{digest}"
    return EmbedResponse(embedding=embedding_from_seed(seed), modelName=model_name)


@app.post("/ocr", response_model=OcrResponse)
def ocr(payload: OcrRequest):
    logger.info("OCR requested file=%s tier=%s", payload.fileId, payload.modelTier)
    _ = MODEL_REGISTRY[payload.modelTier]["ocr"]
    # Request-based fallback path remains for compatibility.
    text = payload.fileName.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    if not text:
        text = "No extracted text"
    return OcrResponse(text=text, language="en", source="fallback_name")


@app.post("/ocr/stream", response_model=OcrResponse)
async def ocr_stream(request: Request):
    tier = _resolve_tier(request.headers.get("x-model-tier"))
    _ = MODEL_REGISTRY[tier]["ocr"]

    file_name = request.headers.get("x-file-name", "file")
    mime_type = request.headers.get("x-mime-type", "application/octet-stream")
    body = await request.body()

    logger.info(
        "OCR stream requested file=%s tier=%s mime=%s bytes=%s",
        file_name,
        tier,
        mime_type,
        len(body),
    )

    try:
        extracted = extract_text_for_file(file_name, mime_type, body, logger)
    except ValueError as exc:
        detail = str(exc)
        if detail == "unsupported_file_type":
            raise HTTPException(status_code=422, detail=detail)
        if detail == "empty_text":
            raise HTTPException(status_code=422, detail="no_text_extracted")
        raise HTTPException(status_code=500, detail=detail)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    logger.info(
        "Extraction completed file=%s source=%s chars=%s",
        file_name,
        extracted.source,
        len(extracted.text),
    )
    return OcrResponse(
        text=extracted.text,
        language=extracted.language,
        source=extracted.source,
    )
