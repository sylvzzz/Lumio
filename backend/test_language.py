"""Language-consistency checks for the backend.

Run from backend/: ../.venv/bin/python test_language.py
"""
import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

# Env vars api.py needs at import time (dummy values are enough here).
os.environ.setdefault("ALLOWED_EMAILS", "test@example.com")
os.environ.setdefault("OAUTH_REDIRECT_URI", "http://localhost:5173/auth/callback")
os.environ.setdefault("GOOGLE_CLIENT_ID", "x")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "x")
os.environ.setdefault("SESSION_SECRET", "test-secret")
os.environ.setdefault("LLM_API_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parent))
import api  # noqa: E402
from src import qwen  # noqa: E402
import src.chunking  # noqa: E402


class FakeDB:
    """In-memory stand-in for src.db.DB (no Postgres needed)."""

    state: dict = {}

    def __init__(self, user_id=None):
        self.user_id = user_id or "00000000-0000-0000-0000-000000000000"

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def get_user(self):
        return FakeDB.state.get("user")

    def update_user(self, fields):
        FakeDB.state["user"] = {**(FakeDB.state.get("user") or {}), **fields}
        return FakeDB.state["user"]

    def list_notes(self):
        return FakeDB.state.get("notes", [])

    def list_tasks(self):
        return FakeDB.state.get("tasks", [])

    def list_events(self):
        return FakeDB.state.get("events", [])

    def list_documents(self):
        return FakeDB.state.get("docs", [])

    def get_chat(self, chat_id):
        return None

    def create_chat(self, title):
        return {"chat_id": "c1", "title": title, "created_at": "now",
                "updated_at": "now", "messages": []}

    def append_exchange(self, chat_id, prompt, answer, sources=None):
        return chat_id


def _req():
    return SimpleNamespace(session={"user": {"id": "u1", "email": "test@example.com"}})


def temp_storage() -> None:
    """Point the RAG storage at a temp dir and swap the DB for a fake."""
    api.DB = FakeDB
    FakeDB.state = {"user": None, "notes": [], "tasks": [], "events": [], "docs": []}


def check_t_parity():
    assert set(api._T["pt"]) == set(api._T["en"]), "pt/en key mismatch in _T"


def check_user_lang():
    assert api._user_lang(_req()) == "pt"  # missing user -> DEFAULT_LANG
    FakeDB.state["user"] = {"language": "en"}
    assert api._user_lang(_req()) == "en"
    FakeDB.state["user"] = {"language": "fr"}
    assert api._user_lang(_req()) == "pt"  # invalid -> DEFAULT_LANG


def check_update_user_persists():
    api._update_user_profile(api.UserProfile(name="Ana", language="pt"), _req())
    assert api._user_lang(_req()) == "pt"


def check_user_data_context():
    FakeDB.state["events"] = [
        {"id": "e1", "title": "Reunião", "start_time": "2026-11-16T10:00:00",
         "end_time": "2026-11-16T11:00:00", "all_day": False},
        {"id": "e2", "title": "Feriado", "start_time": "2026-11-17T00:00:00",
         "end_time": "2026-11-17T23:59:59", "all_day": True},
    ]
    FakeDB.state["tasks"] = [{"id": "t1", "title": "organize notes", "done": False}]
    FakeDB.state["notes"] = [{"id": "n1", "content": "hello notes world",
                              "updated_at": "2026-11-10T12:00:00"}]

    pt = api._user_data_context(_req(), "pt").content
    assert "segunda 16/11/2026" in pt, "pt day name"
    assert "(dia inteiro)" in pt, "pt all-day marker"
    for header in ("AGENDA", "TAREFAS:", "NOTAS", "INSTRUÇÕES"):
        assert header in pt, header

    en = api._user_data_context(_req(), "en").content
    assert "Monday 16/11/2026" in en, "en day name"
    assert "(all day)" in en, "en all-day marker"
    for header in ("CALENDAR", "TASKS:", "NOTES", "INSTRUCTIONS"):
        assert header in en, header
    assert "segunda" not in en and "INSTRUÇÕES" not in en, "pt leaked into en context"


def check_fit():
    lines = [f"- event line number {i:03d}" for i in range(200)]
    out = api._fit(lines, 200, api._T["pt"]["events"], "pt")
    assert "omitidos por falta de espaço" in out[-1]
    out = api._fit(lines, 200, api._T["en"]["events"], "en")
    assert "omitted for space" in out[-1]


def check_search():
    FakeDB.state["user"] = {"language": "en"}
    res = api.search(_req(), "notes")["results"]
    titles = {r["title"]: r["preview"] for r in res}
    assert "Notes" in titles and titles["Notes"] == "Page", titles
    assert "Note" in titles, titles  # the note itself, localized label

    FakeDB.state["user"] = {"language": "pt"}
    res = api.search(_req(), "notes")["results"]  # EN keyword still matches in PT UI
    titles = {r["title"]: r["preview"] for r in res}
    assert "Notas" in titles and titles["Notas"] == "Página", titles
    assert titles.get("Nota") == "hello notes world", titles  # note result: content as preview
    assert "organize notes" in titles and titles["organize notes"] == "Tarefa", titles

    FakeDB.state["docs"] = [{"id": "x1", "filename": "myfile.txt"}]
    res = [r for r in api.search(_req(), "myfile")["results"] if r["type"] == "document"]
    assert len(res) == 1 and res[0]["title"] == "myfile.txt", res
    assert res[0]["preview"] == "Documento", res[0]


def check_new_chat_title():
    FakeDB.state["user"] = {"language": "pt"}
    assert api.create_chat_session(_req(), {})["title"] == "Nova conversa"
    FakeDB.state["user"] = {"language": "en"}
    assert api.create_chat_session(_req(), {})["title"] == "New Chat"


def check_qwen_prompt():
    assert qwen.system_prompt("pt").endswith("Always answer in Portuguese.")
    assert qwen.system_prompt("en").endswith("Always answer in English.")
    assert qwen.system_prompt(None).endswith(qwen._QUESTION_LANG_PROMPT)
    assert qwen.system_prompt("fr").endswith(qwen._QUESTION_LANG_PROMPT)

    m = qwen.Model(model_name="test")
    assert "Portuguese" in m._messages("Q", [], None, "pt")[0]["content"]
    assert "same language" in m._messages("Q", [], None, None)[0]["content"]


def check_send_threading():
    seen = {}
    engine = mock.Mock()
    engine.answer = mock.Mock(return_value=mock.Mock(answer="ok"))

    def fake_ms(request, query, lang):
        seen["model_sources"] = lang
        return [], []

    def fake_us(request, query, answer, found, lang):
        seen["used_sources"] = lang
        return []

    req = api.ChatMessageReq(session="missing-session", content="hi")
    with mock.patch.object(api, "_model_sources", fake_ms), \
         mock.patch.object(api, "_used_sources", fake_us), \
         mock.patch.object(FakeDB, "append_exchange", lambda self, *a, **k: "c"), \
         mock.patch.object(api, "_load_engine", return_value=engine):
        api.send_chat_message(req, _req())
    assert seen == {"model_sources": "en", "used_sources": "en"}, seen
    assert engine.answer.call_args.args[3] == "en", "lang not threaded to answer()"


async def _drain(resp) -> str:
    return "".join([chunk async for chunk in resp.body_iterator])


def check_stream_threading():
    seen = {}
    engine = mock.Mock()
    engine.answer_stream = mock.Mock(return_value=iter(["ok ", "answer"]))

    def fake_ms(request, query, lang):
        seen["model_sources"] = lang
        return [], []

    def fake_us(request, query, answer, found, lang):
        seen["used_sources"] = lang
        return []

    FakeDB.state["user"] = {"language": "pt"}
    req = api.ChatMessageReq(session="missing-session", content="hi")
    with mock.patch.object(api, "_model_sources", fake_ms), \
         mock.patch.object(api, "_used_sources", fake_us), \
         mock.patch.object(FakeDB, "append_exchange", lambda self, *a, **k: "c"), \
         mock.patch.object(api, "_load_engine", return_value=engine):
        resp = api.stream_chat_message(req, _req())
        body = asyncio.run(_drain(resp))  # must drain inside: generator is lazy
    assert '"text"' in body and "event: done" in body, body
    assert seen == {"model_sources": "pt", "used_sources": "pt"}, seen
    assert engine.answer_stream.call_args.args[3] == "pt", "lang not threaded to answer_stream()"


def check_user_isolation():
    """Ficheiros e índices de RAG são isolados por utilizador."""
    import tempfile

    other = SimpleNamespace(session={"user": {"id": "u2", "email": "b@example.com"}})

    with tempfile.TemporaryDirectory() as tmp:
        old = os.getcwd()
        os.chdir(tmp)
        try:
            # pastas distintas por utilizador
            d1, d2 = api._user_files_dir(_req()), api._user_files_dir(other)
            assert d1 != d2 and d1.is_dir() and d2.is_dir(), (d1, d2)

            # instâncias de RAG distintas com índices distintos
            r1, r2 = api._rag(_req()), api._rag(other)
            assert r1 is not r2 and r1.chunks_file != r2.chunks_file

            # documento do u1 é encontrado por u1 e não por u2
            (d1 / "segredo_utilizador_a.txt").write_text(
                "dados privados e segredo do utilizador A", encoding="utf-8")
            r1.index()

            def hits(rag, q):
                try:
                    return rag.search(q, 5).retrieved_sources
                except Exception:
                    return []

            assert any("segredo" in s.content for s in hits(r1, "segredo"))
            assert hits(r2, "segredo") == [], "u2 found u1's private file"
        finally:
            os.chdir(old)


def main() -> None:
    temp_storage()
    checks = [
        check_t_parity,
        check_user_lang,
        check_update_user_persists,
        check_user_data_context,
        check_fit,
        check_search,
        check_new_chat_title,
        check_qwen_prompt,
        check_send_threading,
        check_stream_threading,
        check_user_isolation,
    ]
    for check in checks:
        check()
        print(f"ok: {check.__name__}")
    print("test_language: all checks passed")


if __name__ == "__main__":
    main()
