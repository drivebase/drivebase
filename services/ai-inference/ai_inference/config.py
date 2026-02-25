from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Literal

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


def default_models_dir() -> Path:
    # Dev default: project folder ./.drivebase/models
    cwd = Path.cwd()
    return cwd / ".drivebase" / "models"


MODELS_DIR = Path(os.getenv("AI_MODELS_DIR", str(default_models_dir())))
MODELS_DIR.mkdir(parents=True, exist_ok=True)

_download_urls_env = os.getenv("AI_MODEL_ASSET_URLS", "{}")
try:
    MODEL_ASSET_URLS: Dict[str, str] = json.loads(_download_urls_env)
except json.JSONDecodeError:
    MODEL_ASSET_URLS = {}

