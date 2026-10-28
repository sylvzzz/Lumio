"""Chunk the raw corpus into MinimalSource pieces."""
from pathlib import Path
from typing import List, cast

from docx import Document
from langchain_text_splitters import (
    Language,
    RecursiveCharacterTextSplitter,
)
from pypdf import PdfReader

from .models import MinimalSource

RAW_DIR = "data/raw/vllm-0.10.1"
FILES_DIR = "data/files"


def pdf_to_text_file(file_path: Path) -> str:
    """Convert a PDF file to plain text."""
    reader = PdfReader(str(file_path))
    pages_text: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(text)
    return "\n\n".join(pages_text)


def docx_to_text_file(file_path: Path) -> str:
    """Convert a DOCX file to plain text."""
    doc = Document(str(file_path))
    paragraphs: List[str] = []
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)
    return "\n\n".join(paragraphs)


def _read_text(doc: Path) -> str | None:
    """Read a file and return plain text depending on extension."""
    suffix = doc.suffix.lower()
    try:
        if suffix in {".txt", ".md"}:
            return doc.read_text(encoding="utf-8", errors="ignore")
        if suffix == ".pdf":
            return pdf_to_text_file(doc)
        if suffix == ".docx":
            return docx_to_text_file(doc)
    except Exception:
        return None
    return None


def _chunks_from_file(doc: Path,
                      splitter: RecursiveCharacterTextSplitter
                      ) -> List[MinimalSource]:
    """Split one file into MinimalSource chunks with character offsets."""
    text = _read_text(doc)
    if not text:
        return []

    results: List[MinimalSource] = []
    for chunk in splitter.create_documents([text]):
        start = int(chunk.metadata["start_index"])
        results.append(
            MinimalSource(
                file_path=str(doc),
                first_character_index=start,
                last_character_index=len(chunk.page_content) + start,
                content=chunk.page_content,
            )
        )
    return results


def create_chunks_for_text(chunk_size: int) -> List[MinimalSource]:
    """Chunk every .txt/.md/.pdf/.docx file of the corpus."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_overlap=0,
        chunk_size=chunk_size,
        add_start_index=True,
        strip_whitespace=False,
    )
    valid = {".txt", ".md", ".pdf", ".docx"}
    results: List[MinimalSource] = []
    for base in (RAW_DIR, FILES_DIR):
        base_path = Path(base)
        if not base_path.exists():
            continue
        for doc in base_path.rglob("*"):
            if doc.is_file() and doc.suffix.lower() in valid:
                results.extend(_chunks_from_file(doc, splitter))
    return results


def create_chunks_for_code(chunk_size: int) -> List[MinimalSource]:
    """Chunk every .py file of the corpus."""
    results: List[MinimalSource] = []
    for base in (RAW_DIR, FILES_DIR):
        base_path = Path(base)
        if not base_path.exists():
            continue
        for doc in base_path.rglob("*"):
            if doc.is_file() and doc.suffix.lower() == ".py":
                splitter = RecursiveCharacterTextSplitter(
                    cast(List[str], Language.PYTHON),
                    chunk_overlap=0,
                    chunk_size=chunk_size,
                    add_start_index=True,
                    strip_whitespace=False,
                )
                results.extend(_chunks_from_file(doc, splitter))
    return results
