from __future__ import annotations

import io
from collections import defaultdict
from functools import lru_cache
from typing import Literal


TierType = Literal["lightweight", "medium", "heavy"]

YOLO_MODEL_BY_TIER: dict[TierType, str] = {
    "lightweight": "yolov8n.pt",
    "medium": "yolov8s.pt",
    "heavy": "yolov9c.pt",
}


@lru_cache(maxsize=3)
def _load_yolo(model_name: str):
    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise RuntimeError("missing_object_detection_dependency:ultralytics") from exc
    return YOLO(model_name)


def _normalize_label(label: str) -> str:
    return label.strip().lower()


def detect_objects_from_image_bytes(payload: bytes, tier: TierType) -> list[dict]:
    try:
        from PIL import Image
    except Exception as exc:
        raise RuntimeError("missing_object_detection_dependency:pillow") from exc

    model_name = YOLO_MODEL_BY_TIER[tier]
    model = _load_yolo(model_name)

    image = Image.open(io.BytesIO(payload)).convert("RGB")
    results = model.predict(image, verbose=False)
    if not results:
        return []

    result = results[0]
    names = result.names
    if names is None:
        return []

    boxes = result.boxes
    if boxes is None:
        return []

    grouped: dict[str, dict] = {}
    counts = defaultdict(int)

    for box in boxes:
        cls_idx = int(box.cls.item()) if box.cls is not None else -1
        if cls_idx < 0 or cls_idx not in names:
            continue

        label = _normalize_label(str(names[cls_idx]))
        confidence = float(box.conf.item()) if box.conf is not None else 0.0
        xywh = box.xywh[0].tolist() if box.xywh is not None else [0, 0, 0, 0]
        x, y, w, h = [float(v) for v in xywh]

        counts[label] += 1
        existing = grouped.get(label)
        if existing is None or confidence > float(existing["confidence"]):
            grouped[label] = {
                "label": label,
                "confidence": confidence,
                "bbox": {
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h,
                },
                "count": 1,
            }

    for label, count in counts.items():
        if label in grouped:
            grouped[label]["count"] = int(count)

    return list(grouped.values())

