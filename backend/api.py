"""FastAPI backend for Lumio (42-rag style, multi-user local)."""
import json
import os
import re
import shutil
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from src import auth
from src.db import DB
from src.logger import FatalError
from src.models import MinimalSource
from src.qwen import Model
from src.rag import RAG

from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse, RedirectResponse

from dotenv import load_dotenv

load_dotenv()

# Authorized emails. If ALLOWED_EMAILS is missing or empty, any email can
# create an account and sign in (open signup).
ALLOWED_EMAILS = {
    e.strip().lower() for e in os.environ.get("ALLOWED_EMAILS", "").split(",") if e.strip()
}
OPEN_SIGNUP = not ALLOWED_EMAILS


def email_allowed(email: str) -> bool:
    return OPEN_SIGNUP or email in ALLOWED_EMAILS


if OPEN_SIGNUP:
    print("WARNING: ALLOWED_EMAILS is empty -> any email can create an account.", flush=True)
OAUTH_REDIRECT_URI = os.environ["OAUTH_REDIRECT_URI"]
PUBLIC_PATHS = {"/login", "/auth/callback", "/auth/login", "/auth/register", "/auth/password-strength", "/status"}

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
            return RedirectResponse("/")            # direct browser navigation -> SPA shows the login screen
        return JSONResponse({"detail": "unauthorized"}, status_code=401)

app.add_middleware(AuthGateMiddleware)   # innermost
app.add_middleware(PrefixMiddleware)     # (existing class)
app.add_middleware(
    SessionMiddleware,                   # outermost
    secret_key=os.environ["SESSION_SECRET"],
    https_only=os.getenv("DEV") != "1",
    same_site="lax",
    max_age=12 * 3600,
)


DATA_DIR = Path("data")


def _ensure_shared_knowledge() -> None:
    """Restores data/shared from the image (bind mount shadows /app/data)."""
    src = Path("data_src/shared")
    if not src.is_dir():
        return
    dst = DATA_DIR / "shared"
    dst.mkdir(parents=True, exist_ok=True)
    for f in src.iterdir():
        if f.is_file() and not (dst / f.name).exists():
            shutil.copy(f, dst / f.name)


_ensure_shared_knowledge()


# LLM client shared by all users (holds no per-user state).
_engine: Model | None = None
_engine_lock = threading.Lock()

# One RAG instance per user: isolated folders and indexes.
# ponytail: in-memory dict without expiry; add LRU eviction if there are many users.
_rags: dict[str, RAG] = {}
_rags_lock = threading.Lock()


def _load_engine() -> Model:
    global _engine
    with _engine_lock:
        if _engine is None:
            _engine = Model()
    return _engine


def _rag(request: Request) -> RAG:
    """User's RAG; indexes their files on first use."""
    uid = _uid(request)
    with _rags_lock:
        rag = _rags.get(uid)
        if rag is None:
            rag = RAG(uid)
            try:
                if not Path(rag.chunks_file).exists():
                    rag.index()
            except Exception:
                pass
            _rags[uid] = rag
    return rag


def _user_files_dir(request: Request) -> Path:
    d = DATA_DIR / "files" / _uid(request)
    d.mkdir(parents=True, exist_ok=True)
    return d


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
    if not info.get("email_verified") or not email_allowed(email):
        return RedirectResponse("/auth-error?reason=not_found")
    try:
        with DB() as db:
            if OPEN_SIGNUP:
                _drop_unverified_password(db, email)
            user_id = db.login(email, info.get("sub"))
    except Exception:
        return RedirectResponse("/auth-error?reason=failed")
    request.session.clear()
    request.session["user"] = {"id": user_id, "email": email, "name": info.get("name")}
    return RedirectResponse("/")

def _drop_unverified_password(db: DB, email: str) -> None:
    """Open signup: a password on an account never linked to Google was set without
    proving the email belongs to whoever created it. When the real owner signs in
    with Google (verified email), the old password is deleted so whoever registered
    someone else's email does not keep access to their account."""
    cred = db.get_credentials(email)
    if not cred or not cred["password_hash"]:
        return
    with DB(cred["id"]) as owner:
        user = owner.get_user() or {}
        if not user.get("google_id"):
            owner.clear_password_hash()


login_throttle = auth.LoginThrottle(max_failures=5, window_s=15 * 60)


class PasswordLogin(BaseModel):
    email: str
    password: str


class PasswordRegister(BaseModel):
    name: str = ""
    email: str
    password: str


class PasswordChange(BaseModel):
    current_password: str | None = None
    new_password: str


def _start_session(request: Request, user_id: str, email: str, name: str | None) -> dict:
    request.session.clear()
    user = {"id": user_id, "email": email, "name": name}
    request.session["user"] = user
    return user


@app.post("/auth/login")
def password_login(body: PasswordLogin, request: Request) -> dict:
    email = body.email.strip().lower()
    wait = login_throttle.retry_after(email)
    if wait:
        raise HTTPException(status_code=429, detail="too_many_attempts",
                            headers={"Retry-After": str(wait)})

    cred = None
    if email_allowed(email):
        with DB() as db:
            cred = db.get_credentials(email)
    ok, new_hash = auth.verify_password(cred["password_hash"] if cred else None, body.password)
    if not ok or not cred:
        login_throttle.fail(email)
        raise HTTPException(status_code=401, detail="invalid_credentials")

    login_throttle.reset(email)
    if new_hash:  # Argon2 parameters changed since the hash was created
        with DB(cred["id"]) as db:
            db.set_password_hash(new_hash)
    return _start_session(request, cred["id"], email, cred.get("name"))


class PasswordStrengthQuery(BaseModel):
    password: str = Field(max_length=auth.MAX_PASSWORD_LEN)
    email: str = Field(default="", max_length=254)


@app.post("/auth/password-strength")
def password_strength(body: PasswordStrengthQuery) -> dict:
    score = auth.password_score(body.password, [body.email]) if body.password else 0
    return {"score": score, "label": auth.STRENGTH_LABELS[score], "min_score": auth.MIN_SCORE}


@app.post("/auth/register")
def password_register(body: PasswordRegister, request: Request) -> dict:
    """Registers account (if ALLOWED_EMAILS is empty accepts every email)."""
    email = body.email.strip().lower()
    name = body.name.strip()[:100] or None
    wait = login_throttle.retry_after(f"reg:{email}")
    if wait:
        raise HTTPException(status_code=429, detail="too_many_attempts",
                            headers={"Retry-After": str(wait)})
    if "@" not in email or len(email) > 254:
        raise HTTPException(status_code=422, detail="invalid_email")
    problem = auth.validate_password(body.password, [email, name or ""])
    if problem:
        raise HTTPException(status_code=422, detail=problem)

    if not email_allowed(email):
        login_throttle.fail(f"reg:{email}")
        raise HTTPException(status_code=403, detail="not_allowed")
    with DB() as db:
        user_id = db.register(email, name, auth.hash_password(body.password))
    if not user_id:
        login_throttle.fail(f"reg:{email}")
        raise HTTPException(status_code=409, detail="email_taken")
    return _start_session(request, user_id, email, name)


@app.get("/auth/password")
def password_status(request: Request) -> dict:
    with DB(_uid(request)) as db:
        return {"has_password": bool(db.get_password_hash())}


@app.post("/auth/password")
def set_password(body: PasswordChange, request: Request) -> dict:
    """Set or change the account password while signed in.

    If a password already exists, the current one is required; Google-only
    accounts (valid Google session) may set the first one without it.
    """
    uid = _uid(request)
    email = request.session["user"]["email"]

    problem = auth.validate_password(body.new_password, [email])
    if problem:
        raise HTTPException(status_code=422, detail=problem)

    wait = login_throttle.retry_after(email)
    if wait:
        raise HTTPException(status_code=429, detail="too_many_attempts",
                            headers={"Retry-After": str(wait)})

    with DB(uid) as db:
        current = db.get_password_hash()
        if current:
            ok, _ = auth.verify_password(current, body.current_password or "")
            if not ok:
                login_throttle.fail(email)
                raise HTTPException(status_code=403, detail="wrong_current_password")
        db.set_password_hash(auth.hash_password(body.new_password))
    login_throttle.reset(email)
    return {}


@app.get("/me")
def me(request: Request) -> dict:
    return request.session["user"]

@app.post("/logout")
def logout(request: Request) -> dict:
    request.session.clear()
    return {}



def _uid(request: Request) -> str:
    uid = request.session.get("user", {}).get("id")
    if not uid:
        raise HTTPException(status_code=401, detail="re-login required")
    return uid


def _user_lang(request: Request) -> str:
    """Language configured by the user (users table); 'pt' by default."""
    with DB(_uid(request)) as db:
        lang = (db.get_user() or {}).get("language") or DEFAULT_LANG
    return lang if lang in _T else DEFAULT_LANG


DEFAULT_LANG = "pt"

# Backend strings per language (assistant context, search, etc.).
_T = {
    "pt": {
        "days": ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"],
        "to": "até",
        "from": "de",
        "all_day": "(dia inteiro)",
        "all_days": "(dias inteiros)",
        "multi_day": "(evento de vários dias)",
        "omitted": "omitidos por falta de espaço",
        "events": "eventos",
        "tasks": "tarefas",
        "notes": "notas",
        "docs": "documentos",
        "instructions": (
            "INSTRUÇÕES: Este é o resumo dos dados pessoais do utilizador"
            "{name}. Responde a perguntas naturais sobre estes dados, mesmo que a "
            "pergunta use outras palavras. Faz tu os cálculos de datas (hoje, esta "
            "semana, a próxima semana, em outubro, mês passado...). Eventos de "
            "vários dias decorrem em todos os dias entre o início e o fim. Se algo "
            "estiver relacionado com o pedido, usa-o. Só dizes que não tens "
            "informação quando nada nos dados nem nos excertos de documentos "
            "tiver relação com o pedido."
        ),
        "now_line": "Data e hora atuais:",
        "agenda": "AGENDA (de {range}, por ordem cronológica):",
        "no_events": "(sem eventos)",
        "tasks_header": "TAREFAS:",
        "no_tasks": "(sem tarefas)",
        "notes_header": "NOTAS (mais recentes primeiro):",
        "no_notes": "(sem notas)",
        "docs_header": "DOCUMENTOS CARREGADOS (o conteúdo relevante aparece nos excertos seguintes):",
        "no_docs": "(sem documentos)",
        "keywords_prompt": (
            "Gera até 10 palavras-chave e sinónimos (português e inglês) para "
            "procurar, em documentos e notas pessoais, informação relacionada com "
            "a pergunta. Responde só com as palavras separadas por espaços, sem "
            "pontuação nem explicações."
        ),
        "verifier_prompt": (
            "És um verificador. Recebes a pergunta de um utilizador, a resposta de um "
            "assistente e uma lista de fontes candidatas. Indica que fontes foram "
            "realmente usadas para dar a resposta. Uma fonte conta como usada se a "
            "resposta se baseia nela, incluindo quando conclui que não há nada nela "
            "(ex.: 'não tens eventos esta semana' usa o calendário). Se a resposta é "
            "conversa geral, ou diz que não tem informação sobre o assunto, ou nenhuma "
            "fonte é relevante, devolve []. Responde APENAS com um array JSON de ids, "
            'por exemplo ["calendar"] ou [].'
        ),
        "verifier_question": "Pergunta",
        "verifier_answer": "Resposta",
        "verifier_sources": "Fontes candidatas",
        "cand_calendar": "agenda / eventos do calendário do utilizador",
        "cand_tasks": "lista de tarefas do utilizador",
        "cand_notes": "notas do utilizador",
        "cand_doc": "documento '{name}': {excerpt}",
        "new_chat": "Nova conversa",
        "src_page": "Página",
        "src_note": "Nota",
        "src_event": "Evento",
        "src_task": "Tarefa",
        "src_document": "Documento",
    },
    "en": {
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "to": "to",
        "from": "from",
        "all_day": "(all day)",
        "all_days": "(whole days)",
        "multi_day": "(multi-day event)",
        "omitted": "omitted for space",
        "events": "events",
        "tasks": "tasks",
        "notes": "notes",
        "docs": "documents",
        "instructions": (
            "INSTRUCTIONS: This is a summary of the user's personal data"
            "{name}. Answer natural-language questions about this data, even when "
            "the question uses other words. Do the date math yourself (today, this "
            "week, next week, in October, last month...). Multi-day events span "
            "every day between their start and end. If anything is related to the "
            "request, use it. Only say you have no information when nothing in the "
            "data or the document excerpts relates to the request."
        ),
        "now_line": "Current date and time:",
        "agenda": "CALENDAR (from {range}, chronological order):",
        "no_events": "(no events)",
        "tasks_header": "TASKS:",
        "no_tasks": "(no tasks)",
        "notes_header": "NOTES (most recent first):",
        "no_notes": "(no notes)",
        "docs_header": "UPLOADED DOCUMENTS (relevant content appears in the excerpts below):",
        "no_docs": "(no documents)",
        "keywords_prompt": (
            "Generate up to 10 keywords and synonyms (Portuguese and English) to "
            "search, in personal documents and notes, for information related to "
            "the question. Reply only with the words separated by spaces, no "
            "punctuation or explanations."
        ),
        "verifier_prompt": (
            "You are a verifier. You receive a user's question, an assistant's "
            "answer and a list of candidate sources. State which sources were "
            "actually used to give the answer. A source counts as used if the "
            "answer relies on it, including when it concludes there is nothing in "
            "it (e.g. 'you have no events this week' uses the calendar). If the "
            "answer is general conversation, or says it has no information about "
            "the topic, or no source is relevant, return []. Reply ONLY with a "
            'JSON array of ids, for example ["calendar"] or [].'
        ),
        "verifier_question": "Question",
        "verifier_answer": "Answer",
        "verifier_sources": "Candidate sources",
        "cand_calendar": "the user's calendar / schedule",
        "cand_tasks": "the user's task list",
        "cand_notes": "the user's notes",
        "cand_doc": "document '{name}': {excerpt}",
        "new_chat": "New Chat",
        "src_page": "Page",
        "src_note": "Note",
        "src_event": "Event",
        "src_task": "Task",
        "src_document": "Document",
    },
}


def _sync_notes_and_calendar_to_files(request: Request) -> None:
    files_dir = _user_files_dir(request)
    with DB(_uid(request)) as db:
        notes = db.list_notes()
        events = db.list_events()
    keep = set()
    for n in notes:
        content = n.get("content") or ""
        if not content.strip():
            continue
        path = files_dir / f"note_{n['id']}.txt"
        keep.add(path.name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        with open(f"{path}.meta.json", "w", encoding="utf-8") as f:
            json.dump({"original_name": "Nota.txt"}, f)
    for e in events:
        title = e.get("title") or ""
        text = (f"Evento: {title}\nDescrição: {e.get('description')}\n"
                f"Início: {e.get('start_time')}\nFim: {e.get('end_time')}\n"
                f"Todo o dia: {e.get('all_day')}\n")
        path = files_dir / f"event_{e['id']}.txt"
        keep.add(path.name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        with open(f"{path}.meta.json", "w", encoding="utf-8") as f:
            json.dump({"original_name": f"Evento - {title}.txt"}, f)
    # Remove generated files for notes/events that were deleted.
    for p in files_dir.iterdir():
        if p.is_file() and p.name.startswith(_GENERATED_PREFIXES) and p.name not in keep:
            p.unlink(missing_ok=True)
            Path(f"{p}.meta.json").unlink(missing_ok=True)


def _rebuild_index(request: Request, max_chunk_size: int = 2000) -> None:
    _sync_notes_and_calendar_to_files(request)
    try:
        _rag(request).index(max_chunk_size)
    except Exception:
        pass


def _save_upload(request: Request, file: UploadFile) -> tuple[Path, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File has no name")

    original = Path(file.filename).name
    if not original.lower().endswith(ALLOWED_SUFFIXES):
        raise HTTPException(
            status_code=400, detail="Only .pdf, .docx, .md, .txt files are supported"
        )

    out_path = _user_files_dir(request) / f"{uuid.uuid4().hex}_{original}"
    with open(out_path, "wb") as f:
        f.write(file.file.read())
    with open(f"{out_path}.meta.json", "w", encoding="utf-8") as f:
        json.dump({"original_name": original}, f)
    return out_path, original


@app.get("/status")
def status() -> dict[str, int]:
    return {"status": 200}


@app.get("/")
def root() -> dict[str, str]:
    return {"value": "Lumio RAG API"}


@app.get("/chat-sessions/")
def get_chat_sessions(request: Request) -> list[dict]:
    with DB(_uid(request)) as db:
        sessions = db.list_chats()
    result = []
    for s in sessions:
        chat_id = s.get("chat_id")
        if not chat_id:
            continue
        history = s.get("messages", [])
        result.append(
            {
                "id": chat_id,
                "title": s.get("title") or _T[_user_lang(request)]["new_chat"],
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
def create_chat_session(request: Request, body: dict) -> dict:
    title = body.get("title") or _T[_user_lang(request)]["new_chat"]
    with DB(_uid(request)) as db:
        chat = db.create_chat(title)
    return {**chat, "id": chat["chat_id"]}


@app.post("/chat-messages/")
def send_chat_message(req: ChatMessageReq, request: Request) -> dict:
    query = req.content
    lang = _user_lang(request)
    history = []
    with DB(_uid(request)) as db:
        chat = db.get_chat(req.session)
    if chat:
        for m in chat.get("messages", [])[-10:]:
            history.append({"role": m.get("role"), "content": m.get("content", "")})

    try:
        for_model, found = _model_sources(request, query, lang)
        model_res = _load_engine().answer(query, for_model, history, lang)
        answer = model_res.answer
        sources = _used_sources(request, query, answer, found, lang)
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
        with DB(_uid(request)) as db:
            db.append_exchange(req.session, query, answer,
                               sources=[s.model_dump() for s in sources])
    except Exception:
        pass

    return {**user_msg, "ai_response": ai_msg}


# ---------------------------------------------------------------------------
# Assistant with access to the user's data.
#
# Instead of guessing keywords, the model always receives a summary of the
# personal data (calendar, tasks, notes, document list) + today's date, and
# reasons over it ("this week", "in October", "what's left to do"...). Long
# document contents come from the BM25 search, now extended with keywords and
# synonyms generated by the model itself.
# ---------------------------------------------------------------------------
_CONTEXT_PATH = "0-dados-do-utilizador"
# Internal files generated from notes and events: never shown to the user.
_GENERATED_PREFIXES = ("note_", "event_")


try:
    from zoneinfo import ZoneInfo
    _LOCAL_TZ = ZoneInfo(os.getenv("LUMIO_TZ", "Europe/Lisbon"))
except Exception:  # no timezone database on the system
    _LOCAL_TZ = timezone.utc


def _now_local() -> datetime:
    return datetime.now(_LOCAL_TZ).replace(tzinfo=None)


def _parse_dt(value: Any) -> datetime | None:
    """Read an ISO date; values with a timezone (e.g. 'Z') are converted to local time."""
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


def _fit(lines: list[str], budget: int, what: str, lang: str) -> list[str]:
    out, used = [], 0
    for i, line in enumerate(lines):
        if used + len(line) + 1 > budget:
            out.append(f"(+{len(lines) - i} {what} {_T[lang]['omitted']})")
            break
        out.append(line)
        used += len(line) + 1
    return out


def _to_aware(value: Any) -> datetime | None:
    """Read an ISO date; values without a timezone are interpreted as local time."""
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=_LOCAL_TZ)


def _calendar_lines(events: list[dict], today: datetime, lang: str) -> tuple[list[str], str]:
    lo, hi = today - timedelta(days=120), today + timedelta(days=400)
    rows = []
    for e in events:
        s = _parse_dt(e.get("start_time"))
        if s is None:
            continue
        en = _parse_dt(e.get("end_time")) or s
        if en < lo or s >= hi:
            continue
        rows.append((s, en, e))
    rows.sort(key=lambda r: r[0])

    def day(d: datetime) -> str:
        return f"{_T[lang]['days'][d.weekday()]} {d:%d/%m/%Y}"

    lines = []
    for s, en, e in rows:
        multi_day = en.date() > s.date()
        if e.get("all_day"):
            when = f"{day(s)} {_T[lang]['to']} {day(en)} {_T[lang]['all_days']}" if multi_day else f"{day(s)} {_T[lang]['all_day']}"
        elif multi_day:
            when = f"{_T[lang]['from']} {day(s)} {s:%H:%M} {_T[lang]['to']} {day(en)} {en:%H:%M} {_T[lang]['multi_day']}"
        else:
            when = f"{day(s)} {s:%H:%M}–{en:%H:%M}"
        desc = _one_line(e.get("description"), 100)
        lines.append(f"- {when} | {_one_line(e.get('title'), 100)}" + (f" | {desc}" if desc else ""))
    return lines, f"{lo:%d/%m/%Y} {_T[lang]['to']} {hi:%d/%m/%Y}"


def _user_data_context(request: Request, lang: str) -> MinimalSource:
    t = _T[lang]
    now = _now_local()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    with DB(_uid(request)) as db:
        user = db.get_user() or {}
        events = db.list_events()
        tasks = db.list_tasks()
        notes = db.list_notes()
        docs = db.list_documents()

    cal, cal_range = _calendar_lines(events, today, lang)
    pending = [f"- [ ] {_one_line(t.get('title'), 120)}" for t in tasks if not t.get("done")]
    done = [f"- [x] {_one_line(t.get('title'), 120)}" for t in tasks if t.get("done")][-15:]

    notes = sorted(notes, key=lambda n: n.get("updated_at") or "", reverse=True)
    note_lines = []
    for n in notes:
        d = _parse_dt(n.get("updated_at"))
        note_lines.append(f"- ({d:%d/%m/%Y})" if d else "-")
        note_lines[-1] += f" {_one_line(n.get('content'), 300)}"

    doc_lines = [f"- {_one_line(d.get('filename'), 100)}" for d in docs]

    parts = [
        t["instructions"].format(name=f" ({user.get('name')})" if user.get("name") else ""),
        f"{t['now_line']} {_T[lang]['days'][now.weekday()]}, {now:%d/%m/%Y %H:%M}.",
        t["agenda"].format(range=cal_range),
        *(_fit(cal, 5000, t["events"], lang) or [t["no_events"]]),
        t["tasks_header"],
        *(_fit(pending + done, 1500, t["tasks"], lang) or [t["no_tasks"]]),
        t["notes_header"],
        *(_fit(note_lines, 2500, t["notes"], lang) or [t["no_notes"]]),
        t["docs_header"],
        *(_fit(doc_lines, 800, t["docs"], lang) or [t["no_docs"]]),
    ]
    text = "\n".join(parts)
    return MinimalSource(file_path=_CONTEXT_PATH, first_character_index=0,
                         last_character_index=len(text), content=text)


def _llm_text(system: str, user: str, max_tokens: int = 120) -> str:
    engine = _load_engine()
    res = engine.client.chat.completions.create(
        model=engine.model_name,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0,
        max_tokens=max_tokens,
    )
    text = res.choices[0].message.content or ""
    return text.split("</think>")[-1].strip()


def _search_keywords(query: str, lang: str) -> str:
    """Ask the model for keywords and synonyms to search documents."""
    try:
        text = _llm_text(
            _T[lang]["keywords_prompt"],
            query[:500],
        )
        return " ".join(text.split())[:300]
    except Exception:
        return ""


def _model_sources(request: Request, query: str, lang: str) -> tuple[list[MinimalSource], list[MinimalSource]]:
    """Return (sources for the model, excerpts found by the search)."""
    try:
        keywords = _search_keywords(query, lang)
        found = _rag(request).search(f"{query} {keywords}".strip(), 8).retrieved_sources
    except Exception:
        found = []
    found = [s for s in found if not Path(s.file_path).name.startswith("event_")][:5]
    return [_user_data_context(request, lang)] + found, found


# --- Sources shown to the user: only what the model actually used ------------
_SOURCE_LABELS = {
    "pt": {"calendar": "Calendário", "tasks": "Tarefas", "notes": "Notas"},
    "en": {"calendar": "Calendar", "tasks": "Tasks", "notes": "Notes"},
}


def _used_sources(request: Request, query: str, answer: str,
                  found: list[MinimalSource], lang: str) -> list[MinimalSource]:
    """Ask the model which sources supported the answer and return only those.

    Fails silently: if it cannot be determined, nothing is shown (better than
    showing unrelated files).
    """
    if not answer.strip():
        return []
    try:
        t = _T[lang]
        labels = _SOURCE_LABELS.get(lang, _SOURCE_LABELS["en"])
        with DB(_uid(request)) as db:
            has_events = bool(db.list_events())
            has_tasks = bool(db.list_tasks())
            has_notes = bool(db.list_notes())

        # candidates
        cands: dict[str, str] = {}
        if has_events:
            cands["calendar"] = t["cand_calendar"]
        if has_tasks:
            cands["tasks"] = t["cand_tasks"]
        note_chunks = [s for s in found if Path(s.file_path).name.startswith("note_")]
        if has_notes or note_chunks:
            extra = "; ".join(_one_line(s.content, 120) for s in note_chunks[:3])
            cands["notes"] = t["cand_notes"] + (f" (ex.: {extra})" if extra else "")
        doc_by_id: dict[str, list[MinimalSource]] = {}
        for s in found:
            name = Path(s.file_path).name
            if name.startswith(_GENERATED_PREFIXES):
                continue
            key = next((k for k, v in doc_by_id.items() if Path(v[0].file_path).name == name), None)
            if key is None:
                key = f"doc{len(doc_by_id) + 1}"
                doc_by_id[key] = []
                cands[key] = t["cand_doc"].format(name=_original_name(request, name), excerpt=_one_line(s.content, 250))
            doc_by_id[key].append(s)
        if not cands:
            return []

        listing = "\n".join(f'- "{k}": {v}' for k, v in cands.items())
        raw = _llm_text(
            t["verifier_prompt"],
            f"{t['verifier_question']}: {query[:500]}\n\n"
            f"{t['verifier_answer']}: {answer[:1500]}\n\n"
            f"{t['verifier_sources']}:\n{listing}",
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


def _source_files(request: Request, sources: list) -> list[dict[str, str]]:
    files = []
    seen = set()
    for source in sources:
        path = getattr(source, "file_path", "")
        name = Path(path).name
        if not name or name in seen:
            continue
        seen.add(name)
        files.append({"document_id": name, "name": _original_name(request, name)})
    return files


@app.post("/chat-messages/stream/")
def stream_chat_message(req: ChatMessageReq, request: Request) -> StreamingResponse:
    query = req.content
    lang = _user_lang(request)
    history = []
    with DB(_uid(request)) as db:
        chat = db.get_chat(req.session)
    if chat:
        for m in chat.get("messages", [])[-10:]:
            history.append({"role": m.get("role"), "content": m.get("content", "")})

    try:
        for_model, found = _model_sources(request, query, lang)
        tokens = _load_engine().answer_stream(query, for_model, history, lang)
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
        sources = _used_sources(request, query, answer, found, lang)
        yield _sse("sources", {"files": _source_files(request, sources)})
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
            with DB(_uid(request)) as db:
                db.append_exchange(
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
def list_notes(request: Request) -> list[dict]:
    with DB(_uid(request)) as db:
        return db.list_notes()


@app.post("/notes/")
def create_note(request: Request, note: NoteCreate) -> dict:
    with DB(_uid(request)) as db:
        n = db.create_note(note.content)
    _rebuild_index(request)
    return n


@app.patch("/notes/{note_id}/")
def update_note(note_id: str, note: NoteUpdate, request: Request) -> dict:
    with DB(_uid(request)) as db:
        n = db.update_note(note_id, note.content)
    if n is None:
        raise HTTPException(status_code=404, detail="Note not found")
    _rebuild_index(request)
    return n


@app.delete("/notes/{note_id}/")
def delete_note(note_id: str, request: Request) -> dict:
    with DB(_uid(request)) as db:
        db.delete_note(note_id)
    _rebuild_index(request)
    return {}


@app.get("/tasks/")
def list_tasks(request: Request) -> list[dict]:
    with DB(_uid(request)) as db:
        return db.list_tasks()


@app.post("/tasks/")
def create_task(request: Request, body: dict) -> dict:
    with DB(_uid(request)) as db:
        return db.create_task(body.get("title", ""))


@app.patch("/tasks/{task_id}/")
def update_task(task_id: str, body: dict, request: Request) -> dict:
    with DB(_uid(request)) as db:
        t = db.update_task(task_id, body)
    if t is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@app.delete("/tasks/{task_id}/")
def delete_task(task_id: str, request: Request) -> dict:
    with DB(_uid(request)) as db:
        db.delete_task(task_id)
    return {}


@app.get("/calendar-events/")
def list_calendar_events(request: Request) -> list[dict]:
    with DB(_uid(request)) as db:
        return db.list_events()


@app.post("/calendar-events/")
def create_calendar_event(ev: CalendarEventCreate, request: Request) -> dict:
    start = _to_aware(ev.start_time)
    if start is None:
        raise HTTPException(status_code=400, detail="Invalid start_time")
    end = _to_aware(ev.end_time) or start
    if end < start:
        raise HTTPException(status_code=400, detail="end_time before start_time")
    with DB(_uid(request)) as db:
        e = db.create_event({
            "title": ev.title,
            "description": ev.description,
            "start_time": start,
            "end_time": end,
            "all_day": ev.all_day,
            "color": ev.color,
        })
    _rebuild_index(request)
    return e


@app.patch("/calendar-events/{event_id}/")
def update_calendar_event(event_id: str, ev: dict, request: Request) -> dict:
    fields = {k: ev[k] for k in ("title", "description", "color", "all_day") if k in ev}
    for k in ("start_time", "end_time"):
        if k in ev:
            dt = _to_aware(ev[k])
            if dt is None:
                raise HTTPException(status_code=400, detail=f"Invalid {k}")
            fields[k] = dt
    with DB(_uid(request)) as db:
        e = db.update_event(event_id, fields)
    if e is None:
        raise HTTPException(status_code=404, detail="Event not found")
    _rebuild_index(request)
    return e


@app.delete("/calendar-events/{event_id}/")
def delete_calendar_event(event_id: str, request: Request) -> dict:
    with DB(_uid(request)) as db:
        db.delete_event(event_id)
    _rebuild_index(request)
    return {}


def _original_name(request: Request, document_id: str) -> str:
    meta = _user_files_dir(request) / f"{document_id}.meta.json"
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
def documents(request: Request) -> list[dict]:
    with DB(_uid(request)) as db:
        return db.list_documents()


@app.get("/document-folders/")
def document_folders() -> list:
    return []


@app.post("/documents/")
def upload_document(request: Request, file: UploadFile = File(...), folder: Optional[str] = Form(None)) -> dict:
    try:
        out_path, original = _save_upload(request, file)
        suffix = out_path.suffix.lower()
        extracted = ""
        from src import chunking
        try:
            if suffix in {".txt", ".md"}:
                extracted = out_path.read_text(encoding="utf-8", errors="ignore")[:2000]
            elif suffix == ".pdf":
                extracted = chunking.pdf_to_text_file(out_path)[:2000]
            elif suffix == ".docx":
                extracted = chunking.docx_to_text_file(out_path)[:2000]
        except Exception:
            extracted = ""
        with DB(_uid(request)) as db:
            doc = db.insert_document(
                doc_id=out_path.name,
                filename=original,
                file_type=suffix.lstrip("."),
                file_size=out_path.stat().st_size,
                storage_path=str(out_path),
                extracted_text=extracted,
            )
        _rebuild_index(request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return doc


@app.delete("/documents/{document_id}/")
def delete_document(document_id: str, request: Request) -> dict:
    try:
        path = _user_files_dir(request) / document_id
        if path.exists():
            path.unlink()
        meta = Path(f"{path}.meta.json")
        if meta.exists():
            meta.unlink()
        try:
            _rag(request).delete_file(str(path))
        except Exception:
            pass
        with DB(_uid(request)) as db:
            db.delete_document(document_id)
        _rebuild_index(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {}


def _get_doc(request: Request, document_id: str) -> dict:
    with DB(_uid(request)) as db:
        doc = db.get_document(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@app.get("/documents/{document_id}/view/")
def view_document(document_id: str, request: Request):
    return FileResponse(_get_doc(request, document_id)["storage_path"])


@app.get("/documents/{document_id}/download/")
def download_document(document_id: str, request: Request):
    doc = _get_doc(request, document_id)
    return FileResponse(doc["storage_path"], filename=doc["filename"])


@app.get("/user/")
def get_user(request: Request) -> dict:
    with DB(_uid(request)) as db:
        return db.get_user() or {}


@app.post("/user/")
def create_user(user: UserProfile, request: Request) -> dict:
    return _update_user_profile(user, request)


@app.put("/user/")
def update_user(user: UserProfile, request: Request) -> dict:
    return _update_user_profile(user, request)


def _update_user_profile(user: UserProfile, request: Request) -> dict:
    fields = {k: v for k, v in user.model_dump().items() if v is not None}
    with DB(_uid(request)) as db:
        return db.update_user(fields)


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
def search(request: Request, q: str = "") -> dict:
    if not q.strip():
        return {"results": []}
    query = q.strip().lower()
    lang = _user_lang(request)
    t = _T[lang]

    out = []
    seen = set()

    # Keywords cover pt + en so matching works in either UI language;
    # only the displayed title depends on the configured language.
    pages = [
        {"title": {"pt": "Início", "en": "Home"}, "url": "/", "keywords": ["inicio", "home", "dashboard"]},
        {"title": {"pt": "Notas", "en": "Notes"}, "url": "/notes", "keywords": ["nota", "notas", "note", "notes"]},
        {"title": {"pt": "Documentos", "en": "Documents"}, "url": "/documents", "keywords": ["documento", "documentos", "document", "documents", "ficheiro", "ficheiros", "file", "files"]},
        {"title": {"pt": "Calendário", "en": "Calendar"}, "url": "/calendar", "keywords": ["calendario", "agenda", "evento", "eventos", "calendar", "event", "events"]},
        {"title": {"pt": "Tarefas", "en": "Tasks"}, "url": "/tasks", "keywords": ["tarefa", "tarefas", "task", "tasks"]},
        {"title": {"pt": "Emails", "en": "Emails"}, "url": "/inbox", "keywords": ["email", "emails", "inbox"]},
        {"title": {"pt": "Lumio", "en": "Lumio"}, "url": "/lumio", "keywords": ["lumio", "chat", "ia", "ai", "assistente", "assistant"]},
        {"title": {"pt": "FAQ", "en": "FAQ"}, "url": "/faq", "keywords": ["faq", "ajuda", "help", "como usar", "how to use", "perguntas", "questions"]},
    ]

    for p in pages:
        if query in p["title"][lang].lower() or any(k in query for k in p["keywords"]):
            key = p["url"]
            if key not in seen:
                out.append({
                    "id": key,
                    "type": "note",
                    "title": p["title"][lang],
                    "preview": t["src_page"],
                    "url": p["url"]
                })
                seen.add(key)

    with DB(_uid(request)) as db:
        notes = db.list_notes()
        events = db.list_events()
        tasks = db.list_tasks()
        docs = db.list_documents()

    for n in notes:
        content = (n.get("content") or "").lower()
        if query in content:
            nid = n.get("id") or ""
            if nid not in seen:
                out.append({
                    "id": nid,
                    "type": "note",
                    "title": t["src_note"],
                    "preview": (n.get("content") or "").replace("\n", " ")[:80],
                    "url": "/notes"
                })
                seen.add(nid)

    for e in events:
        title = (e.get("title") or "").lower()
        desc = (e.get("description") or "").lower()
        if query in title or query in desc:
            eid = e.get("id") or ""
            if eid not in seen:
                out.append({
                    "id": eid,
                    "type": "calendar",
                    "title": e.get("title") or t["src_event"],
                    "preview": (e.get("description") or e.get("title") or "")[:80],
                    "url": "/calendar"
                })
                seen.add(eid)

    for tsk in tasks:
        title = (tsk.get("title") or "").lower()
        if query in title:
            tid = tsk.get("id") or ""
            if tid not in seen:
                out.append({
                    "id": tid,
                    "type": "note",
                    "title": tsk.get("title") or t["src_task"],
                    "preview": t["src_task"],
                    "url": "/tasks"
                })
                seen.add(tid)

    for d in docs:
        orig = (d.get("filename") or "").lower()
        if query in orig:
            did = d.get("id") or ""
            if did not in seen:
                out.append({
                    "id": did,
                    "type": "document",
                    "title": d.get("filename") or t["src_document"],
                    "preview": t["src_document"],
                    "url": "/documents"
                })
                seen.add(did)

    return {"results": out[:20]}