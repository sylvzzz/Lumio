import csv
import io
import os


def extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.txt':
        return extract_txt(file_path)
    elif ext == '.csv':
        return extract_csv(file_path)
    elif ext == '.pdf':
        return extract_pdf(file_path)
    return ''


def extract_txt(file_path: str) -> str:
    try:
        with open(file_path, 'r', errors='replace') as f:
            return f.read()
    except Exception:
        return ''


def extract_csv(file_path: str) -> str:
    try:
        with open(file_path, 'r', errors='replace') as f:
            reader = csv.reader(f)
            rows = list(reader)
            if not rows:
                return ''
            header = ', '.join(rows[0])
            data_lines = [' | '.join(row) for row in rows[1:]]
            return f"Columns: {header}\n\n" + '\n'.join(data_lines[:200])
    except Exception:
        return ''


def extract_pdf(file_path: str) -> str:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return '\n\n'.join(text_parts)
    except Exception:
        return ''
