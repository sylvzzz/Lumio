"""Command-line entry point (Python Fire) for the RAG pipeline."""
import sys

import fire

from .logger import FatalError, Logger
from .rag import RAG

if __name__ == "__main__":
    try:
        fire.Fire(RAG)
    except FatalError:
        sys.exit(1)
    except (OSError, ValueError, TypeError, RuntimeError, KeyError) as e:
        Logger.error(f"Error: {e}")
        sys.exit(1)
