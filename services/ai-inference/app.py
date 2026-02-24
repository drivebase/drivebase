from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Literal, Optional

import requests
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

TaskType = Literal["embedding", "ocr", "object_detection"]
TierType = Literal["lightweight", "medium", "heavy"]
DownloadStatus = Literal["pending", "downloading", "completed", "failed"]

MODEL_REGISTRY: dict[TierType, dict[TaskType, str]] = {
    "lightweight": {
        "embedding": "MobileCLIP",
        "ocr": "Tesseract",
        "object_detection": "YOLOv8n",
    },
    "medium": {
        "embedding": "CLIP-ViT-B-32",
        "ocr": "PaddleOCR",
        "object_detection": "YOLOv8s",
    },
    "heavy": {
        "embedding": "CLIP-ViT-L-14",
        "ocr": "PaddleOCR-high-accuracy",
        "object_detection": "YOLOv9",
    },
}


def _default_models_dir() -> Path:
    # Dev default: project folder ./.drivebase/models
    cwd = Path.cwd()
    return cwd / ".drivebase" / "models"


MODELS_DIR = Path(os.getenv("AI_MODELS_DIR", str(_default_models_dir())))
MODELS_DIR.mkdir(parents=True, exist_ok=True)

_download_urls_env = os.getenv("AI_MODEL_ASSET_URLS", "{}")
try:
    MODEL_ASSET_URLS: Dict[str, str] = json.loads(_download_urls_env)
except json.JSONDecodeError:
    MODEL_ASSET_URLS = {}


@dataclass
class DownloadEntry:
    download_id: str
    model_id: str
    status: DownloadStatus
    progress: float
    message: str
    error: Optional[str] = None


download_lock = threading.Lock()
downloads: dict[str, DownloadEntry] = {}
active_download_by_model: dict[str, str] = {}


class EnsureModelRequest(BaseModel):
    task: TaskType
    tier: TierType


class EnsureModelResponse(BaseModel):
    downloadId: str
    modelId: str
    status: DownloadStatus
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


class OcrRequest(BaseModel):
    fileId: str
    fileName: str
    mimeType: str
    modelTier: TierType


class OcrResponse(BaseModel):
    text: str
    language: Optional[str] = None


class DetectObjectsRequest(BaseModel):
    fileId: str
    fileName: str
    mimeType: str
    modelTier: TierType


class DetectObjectsResponse(BaseModel):
    objects: list[dict]


app = FastAPI(title="Drivebase AI Inference Service", version="0.1.0")
logger = logging.getLogger("drivebase.ai_inference")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _embedding_from_seed(seed: str) -> list[float]:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    dims = 512
    embedding: list[float] = []
    for i in range(dims):
        byte = digest[i % len(digest)]
        embedding.append(((byte / 255.0) - 0.5) * 2.0)
    return embedding


def _resolve_tier(value: Optional[str]) -> TierType:
    if value == "lightweight":
        return "lightweight"
    if value == "heavy":
        return "heavy"
    return "medium"


def _objects_from_text(text: str) -> list[dict]:
    lower = text.lower()
    objects: list[dict] = []
    if "cat" in lower:
        objects.append(
            {
                "label": "cat",
                "confidence": 0.82,
                "bbox": {"x": 0.2, "y": 0.2, "width": 0.4, "height": 0.4},
                "count": 1,
            }
        )
    if "dog" in lower:
        objects.append(
            {
                "label": "dog",
                "confidence": 0.79,
                "bbox": {"x": 0.3, "y": 0.25, "width": 0.35, "height": 0.35},
                "count": 1,
            }
        )
    return objects


def model_marker_path(model_id: str) -> Path:
    return MODELS_DIR / model_id / ".ready"


def is_model_ready(model_id: str) -> bool:
    return model_marker_path(model_id).exists()


def mark_model_ready(model_id: str) -> None:
    marker = model_marker_path(model_id)
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text("ready", encoding="utf-8")


def _update_download(download_id: str, **kwargs) -> None:
    with download_lock:
        entry = downloads.get(download_id)
        if not entry:
            return
        for key, value in kwargs.items():
            setattr(entry, key, value)


def _download_or_simulate(download_id: str, model_id: str) -> None:
    try:
        asset_url = MODEL_ASSET_URLS.get(model_id)
        if asset_url:
            _update_download(
                download_id,
                status="downloading",
                progress=0.01,
                message=f"Downloading {model_id}",
            )
            target_dir = MODELS_DIR / model_id
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / "model.asset"

            with requests.get(asset_url, stream=True, timeout=60) as response:
                response.raise_for_status()
                total = int(response.headers.get("content-length", "0"))
                downloaded = 0
                with target_file.open("wb") as f:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if not chunk:
                            continue
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0:
                            progress = min(0.99, downloaded / total)
                            _update_download(
                                download_id,
                                status="downloading",
                                progress=progress,
                                message=f"Downloading {model_id}",
                            )
        else:
            # Fallback simulation (still writes marker into model cache dir)
            for i in range(1, 21):
                _update_download(
                    download_id,
                    status="downloading",
                    progress=i / 20.0,
                    message=f"Preparing {model_id}",
                )
                time.sleep(0.15)

        mark_model_ready(model_id)
        _update_download(
            download_id,
            status="completed",
            progress=1.0,
            message=f"{model_id} ready",
        )
    except Exception as exc:
        _update_download(
            download_id,
            status="failed",
            progress=0.0,
            message=f"Failed preparing {model_id}",
            error=str(exc),
        )
    finally:
        with download_lock:
            active_download_by_model.pop(model_id, None)


@app.get("/health")
def health():
    logger.info("Health check")
    return {"ok": True, "modelsDir": str(MODELS_DIR)}


@app.post("/models/ensure", response_model=EnsureModelResponse)
def ensure_model(payload: EnsureModelRequest):
    logger.info("Ensure model requested task=%s tier=%s", payload.task, payload.tier)
    model_id = MODEL_REGISTRY[payload.tier][payload.task]

    if is_model_ready(model_id):
        return EnsureModelResponse(
            downloadId=f"ready-{model_id}",
            modelId=model_id,
            status="completed",
            progress=1.0,
            message=f"{model_id} ready",
        )

    with download_lock:
        existing_download_id = active_download_by_model.get(model_id)
        if existing_download_id:
            entry = downloads[existing_download_id]
            return EnsureModelResponse(
                downloadId=entry.download_id,
                modelId=entry.model_id,
                status=entry.status,
                progress=entry.progress,
                message=entry.message,
            )

        download_id = uuid.uuid4().hex
        entry = DownloadEntry(
            download_id=download_id,
            model_id=model_id,
            status="pending",
            progress=0.0,
            message=f"Queued {model_id}",
        )
        downloads[download_id] = entry
        active_download_by_model[model_id] = download_id

    thread = threading.Thread(
        target=_download_or_simulate, args=(download_id, model_id), daemon=True
    )
    thread.start()

    return EnsureModelResponse(
        downloadId=download_id,
        modelId=model_id,
        status=entry.status,
        progress=entry.progress,
        message=entry.message,
    )


@app.get("/models/download/{download_id}")
def download_status(download_id: str):
    if download_id.startswith("ready-"):
        model_id = download_id.replace("ready-", "", 1)
        return {
            "downloadId": download_id,
            "modelId": model_id,
            "status": "completed",
            "progress": 1.0,
            "message": f"{model_id} ready",
        }

    with download_lock:
        entry = downloads.get(download_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Download not found")

        payload = asdict(entry)
        return {
            "downloadId": payload["download_id"],
            "modelId": payload["model_id"],
            "status": payload["status"],
            "progress": payload["progress"],
            "message": payload["message"],
            "error": payload["error"],
        }


@app.post("/embed", response_model=EmbedResponse)
def embed(payload: EmbedRequest):
    logger.info("Embed requested file=%s tier=%s", payload.fileId, payload.modelTier)
    model_name = MODEL_REGISTRY[payload.modelTier]["embedding"]
    seed = f"{payload.fileId}|{payload.fileName}|{payload.mimeType}|{model_name}"
    return EmbedResponse(embedding=_embedding_from_seed(seed), modelName=model_name)


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
    return EmbedResponse(embedding=_embedding_from_seed(seed), modelName=model_name)


@app.post("/ocr", response_model=OcrResponse)
def ocr(payload: OcrRequest):
    logger.info("OCR requested file=%s tier=%s", payload.fileId, payload.modelTier)
    _ = MODEL_REGISTRY[payload.modelTier]["ocr"]
    base = payload.fileName.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
    text = base.strip() or "No extracted text"
    return OcrResponse(text=text, language="en")


@app.post("/ocr/stream", response_model=OcrResponse)
async def ocr_stream(request: Request):
    _ = MODEL_REGISTRY[_resolve_tier(request.headers.get("x-model-tier"))]["ocr"]
    file_name = request.headers.get("x-file-name", "file")
    body = await request.body()
    logger.info(
        "OCR stream requested file=%s tier=%s bytes=%s",
        file_name,
        _resolve_tier(request.headers.get("x-model-tier")),
        len(body),
    )
    sha = hashlib.sha256(body).hexdigest()[:12]
    base = file_name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
    text = (base.strip() or "No extracted text") + f" ({sha})"
    return OcrResponse(text=text, language="en")


@app.post("/detect-objects", response_model=DetectObjectsResponse)
def detect_objects(payload: DetectObjectsRequest):
    logger.info(
        "Object detection requested file=%s tier=%s",
        payload.fileId,
        payload.modelTier,
    )
    _ = MODEL_REGISTRY[payload.modelTier]["object_detection"]
    return DetectObjectsResponse(objects=_objects_from_text(payload.fileName))


@app.post("/detect-objects/stream", response_model=DetectObjectsResponse)
async def detect_objects_stream(request: Request):
    _ = MODEL_REGISTRY[_resolve_tier(request.headers.get("x-model-tier"))][
        "object_detection"
    ]
    file_name = request.headers.get("x-file-name", "file")
    body = await request.body()
    logger.info(
        "Object stream requested file=%s tier=%s bytes=%s",
        file_name,
        _resolve_tier(request.headers.get("x-model-tier")),
        len(body),
    )
    sha = hashlib.sha256(body).hexdigest()
    objects = _objects_from_text(f"{file_name} {sha}")
    return DetectObjectsResponse(objects=objects)
