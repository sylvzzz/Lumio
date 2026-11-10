"""FastAPI backend for Lumio (42-rag style, single-user local)."""
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from src.chunking import FILES_DIR
from src.chat import append_exchange, create_chat, get_chat, list_chats
from src.logger import FatalError
from src.models import MinimalSource
from src.rag import RAG

from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse, RedirectResponse

from dotenv import load_dotenv

load_dotenv()

# authorized mails, app is single user currently
ALLOWED_EMAILS = {e.strip().lower() for e in os.environ["ALLOWED_EMAILS"].split(",")}
OAUTH_REDIRECT_URI = os.environ["OAUTH_REDIRECT_URI"]
PUBLIC_PATHS = {"/login", "/auth/callback", "/status"} 

ALLOWED_SUFFIXES = (".pdf", ".docx", ".md", ".txt")

app = FastAPI(title="Lumio RAG")


class PrefixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.scope.get("path", "")
        if path.startswith("/api/"):
            new_path = path[4:] or "/"
            request.scope["path"] = new_path
        return await call_next(request)


class AuthGateMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in PUBLIC_PATHS or request.session.get("user"):
            return await call_next(request)
        if "text/html" in request.headers.get("accept", ""):
            return RedirectResponse("/api/login")   # navegação direta no browser
        return JSONResponse({"detail": "unauthorized"}, status_code=401)

app.add_middleware(AuthGateMiddleware)   # mais interior
app.add_middleware(PrefixMiddleware)     # (a tua classe existente)
app.add_middleware(
    SessionMiddleware,                   # mais exterior
    secret_key=os.environ["SESSION_SECRET"],
    https_only=os.getenv("DEV") != "1",
    same_site="lax",
    max_age=12 * 3600,
)


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


# AUTH

oauth = OAuth()
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=os.environ["GOOGLE_CLIENT_ID"],
    client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
    client_kwargs={"scope": "openid email profile"},
)

@app.get("/login")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, OAUTH_REDIRECT_URI)

@app.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return RedirectResponse("/auth-error?reason=failed")
    info = token.get("userinfo") or {}
    email = (info.get("email") or "").lower()
    if not info.get("email_verified") or email not in ALLOWED_EMAILS:
        return RedirectResponse("/auth-error?reason=not_found")
    request.session.clear()
    request.session["user"] = {"email": email, "name": info.get("name")}
    return RedirectResponse("/")

@app.get("/me")
def me(request: Request) -> dict:
    return request.session["user"]

@app.post("/logout")
def logout(request: Request) -> dict:
    request.session.clear()
    return {}



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
    result = []
    for s in list_chats():
        chat_id = s.get("chat_id")
        if not chat_id:
            continue
        history = (get_chat(chat_id) or {}).get("messages", [])
        result.append(
            {
                "id": chat_id,
                "title": s.get("title") or "New Chat",
                "messages": [
                    {**m, "id": m.get("id") or f"{chat_id}-{i}", "session": chat_id}
                    for i, m in enumerate(history)
                ],
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at") or s.get("created_at"),
            }
        )
    return result


@app.post("/chat-sessions/")
def create_chat_session(body: dict) -> dict:
    chat = create_chat(body.get("title") or "New Chat")
    return {**chat, "id": chat["chat_id"]}


@app.post("/chat-messages/")
def send_chat_message(req: ChatMessageReq) -> dict:
    query = req.content
    history = []
    chat = get_chat(req.session)
    if chat:
        for m in chat.get("messages", [])[-10:]:
            history.append({"role": m.get("role"), "content": m.get("content", "")})

    try:
        for_model, found = _model_sources(query)
        model_res = rag._load_engine().answer(query, for_model, history)
        answer = model_res.answer
        sources = _used_sources(query, answer, found)
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
        "content": answer,
        "sources": sources,
        "created_at": now,
    }
    try:
        append_exchange(req.session, {"role": "user", "content": query}, {"role": "assistant", "content": answer})
    except Exception:
        pass

    return {**user_msg, "ai_response": ai_msg}


# ---------------------------------------------------------------------------
# Assistente com acesso aos dados do utilizador.
#
# Em vez de adivinhar palavras-chave, o modelo recebe sempre um resumo dos
# dados pessoais (agenda, tarefas, notas, lista de documentos) + a data de
# hoje, e raciocina sobre eles ("esta semana", "em outubro", "o que falta
# fazer"...). Os conteúdos de documentos longos vêm da pesquisa BM25, agora
# alargada com palavras-chave/sinónimos gerados pelo próprio modelo.
# ---------------------------------------------------------------------------
_PT_DAYS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
_CONTEXT_PATH = "0-dados-do-utilizador"
# Ficheiros internos gerados a partir de notas e eventos: nunca aparecem ao utilizador.
_GENERATED_PREFIXES = ("note_", "event_")


try:
    from zoneinfo import ZoneInfo
    _LOCAL_TZ = ZoneInfo(os.getenv("LUMIO_TZ", "Europe/Lisbon"))
except Exception:  # sem base de dados de fusos no sistema
    _LOCAL_TZ = timezone.utc


def _now_local() -> datetime:
    return datetime.now(_LOCAL_TZ).replace(tzinfo=None)


def _parse_dt(value: Any) -> datetime | None:
    """Lê uma data ISO; valores com fuso (ex.: 'Z') são convertidos para a hora local."""
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(_LOCAL_TZ).replace(tzinfo=None)
    return dt


def _one_line(text: Any, limit: int) -> str:
    t = " ".join(str(text or "").split())
    return t if len(t) <= limit else t[: limit - 1] + "…"


def _fit(lines: list[str], budget: int, what: str) -> list[str]:
    out, used = [], 0
    for i, line in enumerate(lines):
        if used + len(line) + 1 > budget:
            out.append(f"(+{len(lines) - i} {what} omitidos por falta de espaço)")
            break
        out.append(line)
        used += len(line) + 1
    return out


def _calendar_lines(today: datetime) -> tuple[list[str], str]:
    lo, hi = today - timedelta(days=120), today + timedelta(days=400)
    rows = []
    for e in _load_json(CALENDAR_FILE, []):
        s = _parse_dt(e.get("start_time"))
        if s is None:
            continue
        en = _parse_dt(e.get("end_time")) or s
        if en < lo or s >= hi:
            continue
        rows.append((s, en, e))
    rows.sort(key=lambda r: r[0])

    def day(d: datetime) -> str:
        return f"{_PT_DAYS[d.weekday()]} {d:%d/%m/%Y}"

    lines = []
    for s, en, e in rows:
        multi_day = en.date() > s.date()
        if e.get("all_day"):
            when = f"{day(s)} até {day(en)} (dias inteiros)" if multi_day else f"{day(s)} (dia inteiro)"
        elif multi_day:
            when = f"de {day(s)} {s:%H:%M} até {day(en)} {en:%H:%M} (evento de vários dias)"
        else:
            when = f"{day(s)} {s:%H:%M}–{en:%H:%M}"
        desc = _one_line(e.get("description"), 100)
        lines.append(f"- {when} | {_one_line(e.get('title'), 100)}" + (f" | {desc}" if desc else ""))
    return lines, f"{lo:%d/%m/%Y} a {hi:%d/%m/%Y}"


def _user_data_context() -> MinimalSource:
    now = _now_local()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    user = _load_json(USER_FILE, {}) or {}

    cal, cal_range = _calendar_lines(today)
    tasks = _load_json(TASKS_FILE, [])
    pending = [f"- [ ] {_one_line(t.get('title'), 120)}" for t in tasks if not t.get("done")]
    done = [f"- [x] {_one_line(t.get('title'), 120)}" for t in tasks if t.get("done")][-15:]

    notes = sorted(_load_json(NOTES_FILE, []), key=lambda n: n.get("updated_at") or "", reverse=True)
    note_lines = []
    for n in notes:
        d = _parse_dt(n.get("updated_at"))
        note_lines.append(f"- ({d:%d/%m/%Y})" if d else "-")
        note_lines[-1] += f" {_one_line(n.get('content'), 300)}"

    docs = []
    try:
        for p in sorted(Path(FILES_DIR).iterdir()):
            if p.is_file() and not p.name.endswith(".meta.json") and not p.name.startswith(_GENERATED_PREFIXES):
                docs.append(f"- {_original_name(p.name)}")
    except OSError:
        pass

    parts = [
        "INSTRUÇÕES: Este é o resumo dos dados pessoais do utilizador"
        + (f" ({user.get('name')})" if user.get("name") else "")
        + ". Responde a perguntas naturais sobre estes dados, mesmo que a pergunta "
        "use outras palavras. Faz tu os cálculos de datas (hoje, esta semana, a "
        "próxima semana, em outubro, mês passado...). Eventos de vários dias "
        "decorrem em todos os dias entre o início e o fim. Se algo estiver relacionado "
        "com o pedido, usa-o. Só dizes que não tens informação quando nada nos "
        "dados nem nos excertos de documentos tiver relação com o pedido.",
        f"Data e hora atuais: {_PT_DAYS[now.weekday()]}, {now:%d/%m/%Y %H:%M}.",
        f"AGENDA (de {cal_range}, por ordem cronológica):",
        *(_fit(cal, 5000, "eventos") or ["(sem eventos)"]),
        "TAREFAS:",
        *(_fit(pending + done, 1500, "tarefas") or ["(sem tarefas)"]),
        "NOTAS (mais recentes primeiro):",
        *(_fit(note_lines, 2500, "notas") or ["(sem notas)"]),
        "DOCUMENTOS CARREGADOS (o conteúdo relevante aparece nos excertos seguintes):",
        *(_fit(docs, 800, "documentos") or ["(sem documentos)"]),
    ]
    text = "\n".join(parts)
    return MinimalSource(file_path=_CONTEXT_PATH, first_character_index=0,
                         last_character_index=len(text), content=text)


def _llm_text(system: str, user: str, max_tokens: int = 120) -> str:
    engine = rag._load_engine()
    res = engine.client.chat.completions.create(
        model=engine.model_name,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0,
        max_tokens=max_tokens,
    )
    text = res.choices[0].message.content or ""
    return text.split("</think>")[-1].strip()


def _search_keywords(query: str) -> str:
    """Pede ao modelo palavras-chave e sinónimos para a pesquisa em documentos."""
    try:
        text = _llm_text(
            "Gera até 10 palavras-chave e sinónimos (português e inglês) para "
            "procurar, em documentos e notas pessoais, informação relacionada com "
            "a pergunta. Responde só com as palavras separadas por espaços, sem "
            "pontuação nem explicações.",
            query[:500],
        )
        return " ".join(text.split())[:300]
    except Exception:
        return ""


def _model_sources(query: str) -> tuple[list[MinimalSource], list[MinimalSource]]:
    """Devolve (fontes para o modelo, excertos encontrados na pesquisa)."""
    try:
        keywords = _search_keywords(query)
        found = rag.search(f"{query} {keywords}".strip(), 8).retrieved_sources
    except Exception:
        found = []
    found = [s for s in found if not Path(s.file_path).name.startswith("event_")][:5]
    return [_user_data_context()] + found, found


# --- Fontes mostradas ao utilizador: só o que o modelo realmente usou ---------
_SOURCE_LABELS = {
    "pt": {"calendar": "Calendário", "tasks": "Tarefas", "notes": "Notas"},
    "en": {"calendar": "Calendar", "tasks": "Tasks", "notes": "Notes"},
}


def _used_sources(query: str, answer: str, found: list[MinimalSource]) -> list[MinimalSource]:
    """Pergunta ao modelo que fontes sustentaram a resposta e devolve só essas.

    Falha em silêncio: se não for possível apurar, não se mostra nada
    (preferível a mostrar ficheiros que não têm nada a ver).
    """
    if not answer.strip():
        return []
    try:
        lang = (_load_json(USER_FILE, {}) or {}).get("language", "pt")
        labels = _SOURCE_LABELS.get(lang, _SOURCE_LABELS["en"])

        # candidatos
        cands: dict[str, str] = {}
        if _load_json(CALENDAR_FILE, []):
            cands["calendar"] = "agenda / eventos do calendário do utilizador"
        if _load_json(TASKS_FILE, []):
            cands["tasks"] = "lista de tarefas do utilizador"
        note_chunks = [s for s in found if Path(s.file_path).name.startswith("note_")]
        if _load_json(NOTES_FILE, []) or note_chunks:
            extra = "; ".join(_one_line(s.content, 120) for s in note_chunks[:3])
            cands["notes"] = "notas do utilizador" + (f" (ex.: {extra})" if extra else "")
        doc_by_id: dict[str, list[MinimalSource]] = {}
        for s in found:
            name = Path(s.file_path).name
            if name.startswith(_GENERATED_PREFIXES):
                continue
            key = next((k for k, v in doc_by_id.items() if Path(v[0].file_path).name == name), None)
            if key is None:
                key = f"doc{len(doc_by_id) + 1}"
                doc_by_id[key] = []
                cands[key] = f"documento '{_original_name(name)}': {_one_line(s.content, 250)}"
            doc_by_id[key].append(s)
        if not cands:
            return []

        listing = "\n".join(f'- "{k}": {v}' for k, v in cands.items())
        raw = _llm_text(
            "És um verificador. Recebes a pergunta de um utilizador, a resposta de um "
            "assistente e uma lista de fontes candidatas. Indica que fontes foram "
            "realmente usadas para dar a resposta. Uma fonte conta como usada se a "
            "resposta se baseia nela, incluindo quando conclui que não há nada nela "
            "(ex.: 'não tens eventos esta semana' usa o calendário). Se a resposta é "
            "conversa geral, ou diz que não tem informação sobre o assunto, ou nenhuma "
            "fonte é relevante, devolve []. Responde APENAS com um array JSON de ids, "
            'por exemplo ["calendar"] ou [].',
            f"Pergunta: {query[:500]}\n\nResposta: {answer[:1500]}\n\nFontes candidatas:\n{listing}",
            max_tokens=60,
        )
        m = re.search(r"\[[^\]]*\]", raw)
        ids = json.loads(m.group(0)) if m else []
        ids = [i for i in ids if isinstance(i, str) and i in cands]

        shown: list[MinimalSource] = []
        for i in ids:
            if i in doc_by_id:
                shown.extend(doc_by_id[i])
            else:
                shown.append(MinimalSource(file_path=labels[i], first_character_index=0,
                                           last_character_index=0, content=""))
        return shown
    except Exception:
        return []


def _sse(event: str, data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _source_files(sources: list) -> list[dict[str, str]]:
    files = []
    seen = set()
    for source in sources:
        path = getattr(source, "file_path", "")
        name = Path(path).name
        if not name or name in seen:
            continue
        seen.add(name)
        files.append({"document_id": name, "name": _original_name(name)})
    return files


@app.post("/chat-messages/stream/")
def stream_chat_message(req: ChatMessageReq) -> StreamingResponse:
    query = req.content
    history = []
    chat = get_chat(req.session)
    if chat:
        for m in chat.get("messages", [])[-10:]:
            history.append({"role": m.get("role"), "content": m.get("content", "")})

    try:
        for_model, found = _model_sources(query)
        tokens = rag._load_engine().answer_stream(query, for_model, history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    def generate():
        parts = []
        try:
            for delta in tokens:
                parts.append(delta)
                yield _sse("delta", {"text": delta})
        except Exception as e:
            yield _sse("error", {"message": str(e)})
            return

        answer = "".join(parts).strip()
        sources = _used_sources(query, answer, found)
        yield _sse("sources", {"files": _source_files(sources)})
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
            "content": answer,
            "sources": [s.model_dump() for s in sources],
            "created_at": now,
        }
        try:
            append_exchange(
                req.session, query, answer,
                sources=[s.model_dump() for s in sources],
            )
        except Exception:
            pass
        yield _sse("done", {"user": user_msg, "ai_response": ai_msg})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


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
            if path.name.startswith(_GENERATED_PREFIXES):
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
            if path.name.startswith(_GENERATED_PREFIXES):
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