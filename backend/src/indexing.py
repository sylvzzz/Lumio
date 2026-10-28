"""Build and persist the BM25 index over the chunks."""
import re
from pathlib import Path

import bm25s

from .models import MinimalSource

INDEX_DIR = "data/processed/indexs"

_UUID_PREFIX = re.compile(r"^[0-9a-f]{32}_")


def _search_text(chunk: MinimalSource) -> str:
    """Return the chunk content preceded by its human-readable file name."""
    name = Path(chunk.file_path).name
    name = _UUID_PREFIX.sub("", name)
    name = Path(name).stem.replace("_", " ").replace("-", " ")
    return f"{name}\n{chunk.content}"


def index_chunks(chunks: list[MinimalSource]) -> None:
    """Tokenize the chunks and build/save a bm25l index.

    The file name is indexed too, so queries such as "cv" match a file
    named ``diogo_silva_cv.pdf`` even when the text never says "cv".

    Args:
        chunks: Chunks to index.

    Raises:
        OSError: If the index cannot be persisted under ``INDEX_DIR``.
    """
    texts = [_search_text(chunk) for chunk in chunks]
    tokens = bm25s.tokenize(texts, leave=True)
    bm25 = bm25s.BM25(method="bm25l", k1=1, b=0.5)
    bm25.index(tokens, leave_progress=True)
    bm25.save(INDEX_DIR, leave_progress=True)
