"""RAG pipeline package."""
import os
from pathlib import Path


def _load_env() -> None:
    """Load KEY=VALUE pairs from .env files without overriding the shell."""
    for path in (Path.cwd() / ".env", Path(__file__).with_name(".env")):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_env()
