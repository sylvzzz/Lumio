"""Language-consistency checks for the backend.

Run from backend/: ../.venv/bin/python test_language.py
"""
import asyncio
import os
import sys
import tempfile
from pathlib import Path
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


def temp_storage() -> None:
    """Point all storage paths at a temp dir so real data is untouched."""
    tmp = Path(tempfile.mkdtemp())
    api.USER_FILE = tmp / "user.json"
    api.NOTES_FILE = tmp / "notes.json"
    api.TASKS_FILE = tmp / "tasks.json"
    api.CALENDAR_FILE = tmp / "calendar.json"
    api.DATA_DIR = tmp / "data"
    api.FILES_DIR = str(tmp / "files")
    (tmp / "files").mkdir()
    src.chunking.FILES_DIR = api.FILES_DIR


def check_t_parity():
    assert set(api._T["pt"]) == set(api._T["en"]), "pt/en key mismatch in _T"


def check_user_lang():
    assert api._user_lang() == "pt"  # missing file -> DEFAULT_LANG
    api._save_json(api.USER_FILE, {"language": "en"})
    assert api._user_lang() == "en"
    api._save_json(api.USER_FILE, {"language": "fr"})
    assert api._user_lang() == "pt"  # invalid -> DEFAULT_LANG


def check_update_user_persists():
    api.update_user(api.UserProfile(name="Ana", language="pt"))
    assert api._user_lang() == "pt"


def check_user_data_context():
    api._save_json(api.CALENDAR_FILE, [
        {"id": "e1", "title": "Reunião", "start_time": "2026-11-16T10:00:00",
         "end_time": "2026-11-16T11:00:00", "all_day": False},
        {"id": "e2", "title": "Feriado", "start_time": "2026-11-17T00:00:00",
         "end_time": "2026-11-17T23:59:59", "all_day": True},
    ])
    api._save_json(api.TASKS_FILE, [{"id": "t1", "title": "organize notes", "done": False}])
    api._save_json(api.NOTES_FILE, [{"id": "n1", "content": "hello notes world",
                                     "updated_at": "2026-11-10T12:00:00"}])

    pt = api._user_data_context("pt").content
    assert "segunda 16/11/2026" in pt, "pt day name"
    assert "(dia inteiro)" in pt, "pt all-day marker"
    for header in ("AGENDA", "TAREFAS:", "NOTAS", "INSTRUÇÕES"):
        assert header in pt, header

    en = api._user_data_context("en").content
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
    (Path(api.FILES_DIR) / "myfile.txt").write_text("some content", encoding="utf-8")

    api._save_json(api.USER_FILE, {"language": "en"})
    res = api.search("notes")["results"]
    titles = {r["title"]: r["preview"] for r in res}
    assert "Notes" in titles and titles["Notes"] == "Page", titles
    assert "Note" in titles, titles  # the note itself, localized label

    api._save_json(api.USER_FILE, {"language": "pt"})
    res = api.search("notes")["results"]  # EN keyword still matches in PT UI
    titles = {r["title"]: r["preview"] for r in res}
    assert "Notas" in titles and titles["Notas"] == "Página", titles
    assert titles.get("Nota") == "hello notes world", titles  # note result: content as preview
    assert "organize notes" in titles and titles["organize notes"] == "Tarefa", titles

    res = [r for r in api.search("myfile")["results"] if r["type"] == "document"]
    assert len(res) == 1 and res[0]["title"] == "myfile.txt", res
    assert res[0]["preview"] == "Documento", res[0]


def check_new_chat_title():
    api._save_json(api.USER_FILE, {"language": "pt"})
    with mock.patch.object(api, "create_chat", lambda title: {"chat_id": "c1", "title": title}):
        assert api.create_chat_session({})["title"] == "Nova conversa"
    api._save_json(api.USER_FILE, {"language": "en"})
    with mock.patch.object(api, "create_chat", lambda title: {"chat_id": "c2", "title": title}):
        assert api.create_chat_session({})["title"] == "New Chat"


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

    def fake_ms(query, lang):
        seen["model_sources"] = lang
        return [], []

    def fake_us(query, answer, found, lang):
        seen["used_sources"] = lang
        return []

    api._save_json(api.USER_FILE, {"language": "en"})
    req = api.ChatMessageReq(session="missing-session", content="hi")
    with mock.patch.object(api, "_model_sources", fake_ms), \
         mock.patch.object(api, "_used_sources", fake_us), \
         mock.patch.object(api, "append_exchange"), \
         mock.patch.object(api.rag, "_load_engine", return_value=engine):
        api.send_chat_message(req)
    assert seen == {"model_sources": "en", "used_sources": "en"}, seen
    assert engine.answer.call_args.args[3] == "en", "lang not threaded to answer()"


async def _drain(resp) -> str:
    return "".join([chunk async for chunk in resp.body_iterator])


def check_stream_threading():
    seen = {}
    engine = mock.Mock()
    engine.answer_stream = mock.Mock(return_value=iter(["ok ", "answer"]))

    def fake_ms(query, lang):
        seen["model_sources"] = lang
        return [], []

    def fake_us(query, answer, found, lang):
        seen["used_sources"] = lang
        return []

    api._save_json(api.USER_FILE, {"language": "pt"})
    req = api.ChatMessageReq(session="missing-session", content="hi")
    with mock.patch.object(api, "_model_sources", fake_ms), \
         mock.patch.object(api, "_used_sources", fake_us), \
         mock.patch.object(api, "append_exchange"), \
         mock.patch.object(api.rag, "_load_engine", return_value=engine):
        resp = api.stream_chat_message(req)
        body = asyncio.run(_drain(resp))  # must drain inside: generator is lazy
    assert '"text"' in body and "event: done" in body, body
    assert seen == {"model_sources": "pt", "used_sources": "pt"}, seen
    assert engine.answer_stream.call_args.args[3] == "pt", "lang not threaded to answer_stream()"


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
    ]
    for check in checks:
        check()
        print(f"ok: {check.__name__}")
    print("test_language: all checks passed")


if __name__ == "__main__":
    main()
