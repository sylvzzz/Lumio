"""FastAPI backend for Lumio (42-rag style, single-user local)."""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.chunking import FILES_DIR
from src.chat import append_exchange, get_chat, list_chats
from src.logger import FatalError
from src.rag import RAG

ALLOWED_SUFFIXES = (".pdf", ".docx", ".md", ".txt")

app = FastAPI(title="Lumio RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PrefixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.scope.get("path", "")
        if path.startswith("/api/"):
            new_path = path[4:] or "/"
            request.scope["path"] = new_path
        return await call_next(request)


app.add_middleware(PrefixMiddleware)

rag = RAG()

DATA_DIR = Path("data")
NOTES_FILE = DATA_DIR / "notes.json"
CALENDAR_FILE = DATA_DIR / "calendar.json"
USER_FILE = DATA_DIR / "user.json"
TASKS_FILE = DATA_DIR / "tasks.json"


class DeleteFileRequest(BaseModel):
    file_path: str


class RenameDocumentRequest(BaseModel):
    original_name: str


class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: str


class CalendarEventCreate(BaseModel):
    title: str
    description: str = ""
    start_time: str
    end_time: str | None = None
    all_day: bool = False
    color: str = "#3b82f6"


class ChatMessageReq(BaseModel):
    session: str
    content: str
    role: str = "user"
    timezone: str | None = None


class UserProfile(BaseModel):
    name: str | None = None
    gender: str | None = None
    language: str | None = None
    age: int | None = None


class ApiKeyConfig(BaseModel):
    provider: str
    api_key: str


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    Path(FILES_DIR).mkdir(parents=True, exist_ok=True)


def _load_json(path: Path, default: Any) -> Any:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _save_json(path: Path, data: Any) -> None:
    _ensure_data_dir()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _sync_notes_and_calendar_to_files() -> None:
    _ensure_data_dir()
    files_dir = Path(FILES_DIR)
    files_dir.mkdir(parents=True, exist_ok=True)
    notes = _load_json(NOTES_FILE, [])
    for n in notes:
        note_id = n.get("id") or str(uuid.uuid4())
        content = n.get("content") or ""
        if not content.strip():
            continue
        path = files_dir / f"note_{note_id}.txt"
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        with open(f"{path}.meta.json", "w", encoding="utf-8") as f:
            json.dump({"original_name": "Nota.txt"}, f)
    events = _load_json(CALENDAR_FILE, [])
    for e in events:
        ev_id = e.get("id") or str(uuid.uuid4())
        title = e.get("title") or ""
        desc = e.get("description") or ""
        start = e.get("start_time") or ""
        end = e.get("end_time") or ""
        all_day = e.get("all_day")
        text = f"Evento: {title}\nDescrição: {desc}\nInício: {start}\nFim: {end}\nTodo o dia: {all_day}\n"
        path = files_dir / f"event_{ev_id}.txt"
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        with open(f"{path}.meta.json", "w", encoding="utf-8") as f:
            json.dump({"original_name": f"Evento - {title}.txt"}, f)


def _rebuild_index(max_chunk_size: int = 2000) -> None:
    _sync_notes_and_calendar_to_files()
    try:
        rag.index(max_chunk_size)
    except Exception:
        pass


def _save_upload(file: UploadFile) -> tuple[Path, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File has no name")

    original = Path(file.filename).name
    if not original.lower().endswith(ALLOWED_SUFFIXES):
        raise HTTPException(
            status_code=400, detail="Only .pdf, .docx, .md, .txt files are supported"
        )

    files_dir = Path(FILES_DIR)
    files_dir.mkdir(parents=True, exist_ok=True)
    out_path = files_dir / f"{uuid.uuid4().hex}_{original}"
    with open(out_path, "wb") as f:
        f.write(file.file.read())
    with open(f"{out_path}.meta.json", "w", encoding="utf-8") as f:
        json.dump({"original_name": original}, f)
    return out_path, original


@app.on_event("startup")
async def startup_event():
    try:
        _rebuild_index()
    except Exception:
        pass


@app.get("/status")
def status() -> dict[str, int]:
    return {"status": 200}


@app.get("/")
def root() -> dict[str, str]:
    return {"value": "Lumio RAG API"}


@app.get("/chat-sessions/")
def get_chat_sessions() -> list[dict]:
    sessions = list_chats()
    result = []
    for s in sessions:
        result.append(
            {
                "id": s.get("id"),
                "title": s.get("title") or "New Chat",
                "messages": s.get("messages", []),
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at") or s.get("created_at"),
            }
        )
    return result


@app.post("/chat-sessions/")
def create_chat_session(body: dict) -> dict:
    import json
    import os
    import uuid
    from datetime import datetime

    os.makedirs("data", exist_ok=True)
    db_path = "data/chats.json"

    if not os.path.exists(db_path) or os.path.getsize(db_path) == 0:
        db = []
    else:
        with open(db_path, "r", encoding="utf-8") as file:
            db = json.load(file)

    chat_id = str(uuid.uuid4())
    title = body.get("title") or "New Chat"
    created_at = datetime.utcnow().isoformat() + "Z"

    chat = {
        "id": chat_id,
        "title": title,
        "messages": [],
        "created_at": created_at,
        "updated_at": created_at
    }

    db.append(chat)

    with open(db_path, "w", encoding="utf-8") as file:
        json.dump(db, file, indent=2, ensure_ascii=False)

    return chat


@app.post("/chat-messages/")
def send_chat_message(req: ChatMessageReq) -> dict:
    query = req.content
    history = []
    chat = get_chat(req.session)
    if chat:
        for m in chat.get("messages", [])[-10:]:
            history.append({"role": m.get("role"), "content": m.get("content", "")})

    try:
        answer_text = rag.answer(query, k=5, history=history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    now = datetime.utcnow().isoformat() + "Z"
    user_msg = {
        "id": str(uuid.uuid4()),
        "session": req.session,
        "role": "user",
        "content": query,
        "sources": [],
        "created_at": now,
    }
    ai_msg = {
        "id": str(uuid.uuid4()),
        "session": req.session,
        "role": "assistant",
        "content": answer_text,
        "sources": [],
        "created_at": now,
    }
    try:
        append_exchange(req.session, {"role": "user", "content": query}, {"role": "assistant", "content": answer_text})
    except Exception:
        pass

    return {**user_msg, "ai_response": ai_msg}


@app.get("/notes/")
def list_notes() -> list[dict]:
    notes = _load_json(NOTES_FILE, [])
    for n in notes:
        if "id" not in n:
            n["id"] = str(uuid.uuid4())
    _save_json(NOTES_FILE, notes)
    return notes


@app.post("/notes/")
def create_note(note: NoteCreate) -> dict:
    notes = _load_json(NOTES_FILE, [])
    now = datetime.utcnow().isoformat() + "Z"
    n = {
        "id": str(uuid.uuid4()),
        "content": note.content,
        "is_pinned": False,
        "created_at": now,
        "updated_at": now,
    }
    notes.append(n)
    _save_json(NOTES_FILE, notes)
    _rebuild_index()
    return n


@app.patch("/notes/{note_id}/")
def update_note(note_id: str, note: NoteUpdate) -> dict:
    notes = _load_json(NOTES_FILE, [])
    now = datetime.utcnow().isoformat() + "Z"
    for n in notes:
        if n.get("id") == note_id:
            n["content"] = note.content
            n["updated_at"] = now
            _save_json(NOTES_FILE, notes)
            _rebuild_index()
            return n
    raise HTTPException(status_code=404, detail="Note not found")


@app.delete("/notes/{note_id}/")
def delete_note(note_id: str) -> dict:
    notes = _load_json(NOTES_FILE, [])
    notes = [n for n in notes if n.get("id") != note_id]
    _save_json(NOTES_FILE, notes)
    _rebuild_index()
    return {}


@app.get("/tasks/")
def list_tasks() -> list[dict]:
    tasks = _load_json(TASKS_FILE, [])
    return tasks


@app.post("/tasks/")
def create_task(body: dict) -> dict:
    tasks = _load_json(TASKS_FILE, [])
    now = datetime.utcnow().isoformat() + "Z"
    t = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", ""),
        "done": False,
        "created_at": now,
        "updated_at": now,
    }
    tasks.append(t)
    _save_json(TASKS_FILE, tasks)
    return t


@app.patch("/tasks/{task_id}/")
def update_task(task_id: str, body: dict) -> dict:
    tasks = _load_json(TASKS_FILE, [])
    for t in tasks:
        if t.get("id") == task_id:
            t.update(body)
            _save_json(TASKS_FILE, tasks)
            return t
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}/")
def delete_task(task_id: str) -> dict:
    tasks = _load_json(TASKS_FILE, [])
    tasks = [t for t in tasks if t.get("id") != task_id]
    _save_json(TASKS_FILE, tasks)
    return {}


@app.get("/calendar-events/")
def list_calendar_events() -> list[dict]:
    events = _load_json(CALENDAR_FILE, [])
    return events


@app.post("/calendar-events/")
def create_calendar_event(ev: CalendarEventCreate) -> dict:
    events = _load_json(CALENDAR_FILE, [])
    e = {
        "id": str(uuid.uuid4()),
        "title": ev.title,
        "description": ev.description or "",
        "start_time": ev.start_time,
        "end_time": ev.end_time,
        "all_day": ev.all_day,
        "color": ev.color,
    }
    events.append(e)
    _save_json(CALENDAR_FILE, events)
    _rebuild_index()
    return e


@app.patch("/calendar-events/{event_id}/")
def update_calendar_event(event_id: str, ev: dict) -> dict:
    events = _load_json(CALENDAR_FILE, [])
    for e in events:
        if e.get("id") == event_id:
            e.update(ev)
            _save_json(CALENDAR_FILE, events)
            _rebuild_index()
            return e
    raise HTTPException(status_code=404, detail="Event not found")


@app.delete("/calendar-events/{event_id}/")
def delete_calendar_event(event_id: str) -> dict:
    events = _load_json(CALENDAR_FILE, [])
    events = [e for e in events if e.get("id") != event_id]
    _save_json(CALENDAR_FILE, events)
    _rebuild_index()
    return {}


def _chunks() -> list:
    from src.rag import CHUNKS_FILE
    try:
        with open(CHUNKS_FILE, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []
    return data if isinstance(data, list) else []


def _original_name(document_id: str) -> str:
    from src.chunking import FILES_DIR
    meta = Path(FILES_DIR) / f"{document_id}.meta.json"
    try:
        with open(meta, encoding="utf-8") as f:
            data = json.load(f)
        name = data.get("original_name")
        if isinstance(name, str) and name:
            return name
    except Exception:
        pass
    prefix, sep, rest = document_id.partition("_")
    if sep and len(prefix) == 32:
        return rest
    return document_id


@app.get("/documents/")
def documents() -> list[dict]:
    counts = {}
    for chunk in _chunks():
        if isinstance(chunk, dict):
            path = chunk.get("file_path")
            if isinstance(path, str):
                counts[path] = counts.get(path, 0) + 1

    files_dir = Path(FILES_DIR)
    result = []
    if files_dir.is_dir():
        from src import chunking
        for path in sorted(files_dir.iterdir()):
            suffix = path.suffix.lower()
            if not path.is_file() or suffix not in ALLOWED_SUFFIXES:
                continue
            if path.name.endswith(".meta.json"):
                continue
            extracted = ""
            try:
                if suffix in {".txt", ".md"}:
                    extracted = path.read_text(encoding="utf-8", errors="ignore")[:2000]
                elif suffix == ".pdf":
                    extracted = chunking.pdf_to_text_file(path)[:2000]
                elif suffix == ".docx":
                    extracted = chunking.docx_to_text_file(path)[:2000]
            except Exception:
                extracted = ""
            result.append(
                {
                    "id": path.name,
                    "folder": None,
                    "filename": _original_name(path.name),
                    "file_type": suffix.lstrip("."),
                    "file_size": path.stat().st_size,
                    "storage_path": str(path),
                    "extracted_text": extracted,
                    "created_at": datetime.fromtimestamp(path.stat().st_mtime).isoformat() + "Z",
                    "updated_at": datetime.fromtimestamp(path.stat().st_mtime).isoformat() + "Z",
                }
            )
    return result


@app.get("/document-folders/")
def document_folders() -> list:
    return []


@app.post("/documents/")
def upload_document(file: UploadFile = File(...), folder: Optional[str] = Form(None)) -> dict:
    try:
        out_path, original = _save_upload(file)
        _rebuild_index()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "id": out_path.name,
        "folder": folder,
        "filename": original,
        "file_type": out_path.suffix.lower().lstrip("."),
        "file_size": out_path.stat().st_size,
        "storage_path": str(out_path),
        "extracted_text": "",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }


@app.delete("/documents/{document_id}/")
def delete_document(document_id: str) -> dict:
    try:
        path = Path(FILES_DIR) / document_id
        if path.exists():
            path.unlink()
        meta = Path(f"{path}.meta.json")
        if meta.exists():
            meta.unlink()
        try:
            rag.delete_file(str(path))
        except Exception:
            pass
        _rebuild_index()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {}


@app.get("/documents/{document_id}/view/")
def view_document(document_id: str):
    path = Path(FILES_DIR) / document_id
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


@app.get("/documents/{document_id}/download/")
def download_document(document_id: str):
    path = Path(FILES_DIR) / document_id
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, filename=_original_name(document_id))


@app.get("/user/")
def get_user() -> dict:
    _ensure_data_dir()
    user = _load_json(USER_FILE, {})
    return user


@app.post("/user/")
def create_user(user: UserProfile) -> dict:
    _ensure_data_dir()
    data = {"name": user.name, "gender": user.gender, "age": user.age, "language": user.language}
    _save_json(USER_FILE, data)
    return data


@app.put("/user/")
def update_user(user: UserProfile) -> dict:
    _ensure_data_dir()
    data = _load_json(USER_FILE, {})
    if user.name is not None:
        data["name"] = user.name
    if user.language is not None:
        data["language"] = user.language
    if user.gender is not None:
        data["gender"] = user.gender
    if user.age is not None:
        data["age"] = user.age
    _save_json(USER_FILE, data)
    return data


@app.post("/api-key/")
def save_api_key(config: ApiKeyConfig) -> dict:
    if config.provider == "groq":
        base_url = "https://api.groq.com/openai/v1"
        model = "qwen/qwen3.8-27b"
    elif config.provider == "openai":
        base_url = "https://api.openai.com/v1"
        model = "gpt-4o-mini"
    elif config.provider == "deepseek":
        base_url = "https://api.deepseek.com/v1"
        model = "deepseek-chat"
    else:
        base_url = "https://api.groq.com/openai/v1"
        model = "qwen/qwen3.8-27b"
    
    content = f"LLM_BASE_URL={base_url}\nLLM_MODEL={model}\nLLM_API_KEY={config.api_key}\n"
    try:
        with open(".env", "w") as f:
            f.write(content)
    except Exception:
        try:
            with open("backend/.env", "w") as f:
                f.write(content)
        except Exception:
            pass
    
    import os
    os.environ["LLM_API_KEY"] = config.api_key
    os.environ["LLM_BASE_URL"] = base_url
    os.environ["LLM_MODEL"] = model
    
    return {"status": "ok"}


@app.get("/search/")
def search(q: str = "") -> dict:
    if not q.strip():
        return {"results": []}
    query = q.strip().lower()

    out = []
    seen = set()

    pages = [
        {"title": "Início", "url": "/", "keywords": ["inicio", "home", "dashboard"]},
        {"title": "Notas", "url": "/notes", "keywords": ["nota", "notas"]},
        {"title": "Documentos", "url": "/documents", "keywords": ["documento", "documentos", "ficheiro", "ficheiros"]},
        {"title": "Calendário", "url": "/calendar", "keywords": ["calendario", "agenda", "evento", "eventos"]},
        {"title": "Tarefas", "url": "/tasks", "keywords": ["tarefa", "tarefas"]},
        {"title": "Emails", "url": "/inbox", "keywords": ["email", "emails", "inbox"]},
        {"title": "Lumio", "url": "/lumio", "keywords": ["lumio", "chat", "ia", "assistente"]},
        {"title": "FAQ", "url": "/faq", "keywords": ["faq", "ajuda", "como usar", "perguntas"]},
    ]

    for p in pages:
        if query in p["title"].lower() or any(k in query for k in p["keywords"]):
            key = p["url"]
            if key not in seen:
                out.append({
                    "id": key,
                    "type": "note",
                    "title": p["title"],
                    "preview": "Página",
                    "url": p["url"]
                })
                seen.add(key)

    notes = _load_json(NOTES_FILE, [])
    for n in notes:
        content = (n.get("content") or "").lower()
        if query in content:
            nid = n.get("id") or ""
            if nid not in seen:
                out.append({
                    "id": nid,
                    "type": "note",
                    "title": "Nota",
                    "preview": (n.get("content") or "").replace("\n", " ")[:80],
                    "url": "/notes"
                })
                seen.add(nid)

    events = _load_json(CALENDAR_FILE, [])
    for e in events:
        title = (e.get("title") or "").lower()
        desc = (e.get("description") or "").lower()
        if query in title or query in desc:
            eid = e.get("id") or ""
            if eid not in seen:
                out.append({
                    "id": eid,
                    "type": "calendar",
                    "title": e.get("title") or "Evento",
                    "preview": (e.get("description") or e.get("title") or "")[:80],
                    "url": "/calendar"
                })
                seen.add(eid)

    tasks = _load_json(TASKS_FILE, [])
    for t in tasks:
        title = (t.get("title") or "").lower()
        if query in title:
            tid = t.get("id") or ""
            if tid not in seen:
                out.append({
                    "id": tid,
                    "type": "note",
                    "title": t.get("title") or "Tarefa",
                    "preview": "Tarefa",
                    "url": "/tasks"
                })
                seen.add(tid)

    files_dir = Path(FILES_DIR)
    if files_dir.is_dir():
        for path in sorted(files_dir.iterdir()):
            if not path.is_file() or path.name.endswith(".meta.json"):
                continue
            if path.name.startswith("note_") or path.name.startswith("event_"):
                continue
            orig = _original_name(path.name).lower()
            if query in orig:
                if path.name not in seen:
                    out.append({
                        "id": path.name,
                        "type": "document",
                        "title": _original_name(path.name),
                        "preview": "Documento",
                        "url": "/documents"
                    })
                    seen.add(path.name)

    return {"results": out[:20]}
