from __future__ import annotations

import hashlib


def embedding_from_seed(seed: str) -> list[float]:
    """Deterministic placeholder embedding until model runtime is wired."""
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    dims = 512
    embedding: list[float] = []
    for i in range(dims):
        byte = digest[i % len(digest)]
        embedding.append(((byte / 255.0) - 0.5) * 2.0)
    return embedding

