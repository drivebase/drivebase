from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import requests

from .config import DownloadStatus, MODEL_ASSET_URLS, MODELS_DIR


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


def ensure_download(model_id: str) -> DownloadEntry:
    if is_model_ready(model_id):
        return DownloadEntry(
            download_id=f"ready-{model_id}",
            model_id=model_id,
            status="completed",
            progress=1.0,
            message=f"{model_id} ready",
        )

    with download_lock:
        existing_download_id = active_download_by_model.get(model_id)
        if existing_download_id:
            return downloads[existing_download_id]

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
    return entry


def get_download_status(download_id: str) -> dict:
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
            raise KeyError(download_id)

        payload = asdict(entry)
        return {
            "downloadId": payload["download_id"],
            "modelId": payload["model_id"],
            "status": payload["status"],
            "progress": payload["progress"],
            "message": payload["message"],
            "error": payload["error"],
        }

