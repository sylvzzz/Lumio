"""PostgreSQL access layer for Lumio.

Every query runs through row-level security: the connection sets
``app.user_id`` (see database/tools/lumio.sql policies), so results are
isolated to the user that owns the ``DB`` instance. ``DB()`` without a
user id can only be used for ``login()`` (security-definer function).
"""
import os
from datetime import datetime
from pathlib import Path
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def _conn_params() -> dict:
    """DATABASE_URL (local dev) or the compose-mounted secrets."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return {"conninfo": url, "client_encoding": "UTF8"}

    def secret(name: str) -> str:
        try:
            return Path(f"/run/secrets/{name}").read_text().strip()
        except OSError:
            return ""

    return {
        "host": os.environ.get("DB_HOST", "database"),
        "port": 5432,
        "dbname": secret("db_name"),
        "user": secret("db_user"),
        "password": secret("db_password"),
        "client_encoding": "UTF8",
    }


def _ser(row: dict | None) -> dict | None:
    """JSON-friendly row: UUID -> str, datetime -> ISO string."""
    if row is None:
        return None
    return {
        k: str(v) if isinstance(v, UUID) else v.isoformat() if isinstance(v, datetime) else v
        for k, v in row.items()
    }


class DB:
    """All SQL Lumio runs, one instance per request, scoped to one user by RLS.

    # ponytail: one new connection per `with` (no pool); psycopg_pool if
    # connection concurrency/latency ever becomes a problem.
    """

    _USER_COLS = "id, email, google_id, name, gender, age, language, created_at"
    _NOTE_COLS = "id, content, is_pinned, created_at, updated_at"
    _TASK_COLS = "id, title, done, created_at, updated_at"
    _EVENT_COLS = "id, title, description, start_time, end_time, all_day, color"
    _CHAT_COLS = "id, title, created_at, updated_at"
    _MSG_COLS = "id, role, content, sources, sent_at AS created_at"
    _DOC_COLS = (
        "id, folder, filename, file_type, file_size, storage_path,"
        " extracted_text, created_at, updated_at"
    )

    def __init__(self, user_id: str | None = None):
        self.user_id = user_id
        self.conn: psycopg.Connection | None = None

    def __enter__(self) -> "DB":
        self.conn = psycopg.connect(row_factory=dict_row, **_conn_params())
        self.conn.execute("SELECT set_config('app.user_id', %s, true)", [self.user_id or ""])
        return self

    def __exit__(self, *exc) -> None:
        try:
            if exc[0] is None:
                self.conn.commit()
            else:
                self.conn.rollback()
        finally:
            self.conn.close()

    # -- generic helpers --------------------------------------------------

    def fetch_all(self, sql: str, params: list | None = None) -> list[dict]:
        return [_ser(r) for r in self.conn.execute(sql, params or []).fetchall()]

    def fetch_one(self, sql: str, params: list | None = None) -> dict | None:
        return _ser(self.conn.execute(sql, params or []).fetchone())

    def execute(self, sql: str, params: list | None = None) -> None:
        self.conn.execute(sql, params or [])

    def _update(self, table: str, row_id: str, fields: dict, allowed: set, cols: str) -> dict | None:
        """UPDATE with whitelisted columns; column names come from code, never user input."""
        keys = [k for k in fields if k in allowed]
        if not keys:
            return self.fetch_one(f"SELECT {cols} FROM {table} WHERE id = %s", [row_id])
        sets = ", ".join(f"{k} = %s" for k in keys)
        params = [fields[k] for k in keys] + [row_id]
        return self.fetch_one(f"UPDATE {table} SET {sets} WHERE id = %s RETURNING {cols}", params)

    # -- users ---------------------------------------------------------------

    def login(self, email: str, google_id: str | None) -> str:
        """Create-or-fetch the user row for an email (security definer, RLS-exempt)."""
        return self.fetch_one("SELECT lumio_login(%s, %s) AS id", [email, google_id])["id"]

    def get_user(self) -> dict | None:
        return self.fetch_one(f"SELECT {self._USER_COLS} FROM users")

    # -- password auth (hash is never part of _USER_COLS) -----------------

    def get_credentials(self, email: str) -> dict | None:
        """{id, name, password_hash} for an email, or None (security definer, pre-session)."""
        return self.fetch_one("SELECT * FROM lumio_get_credentials(%s)", [email])

    def set_password_by_email(self, email: str, password_hash: str) -> str:
        """Create-or-update the user's password hash by email (security definer)."""
        return self.fetch_one("SELECT lumio_set_password(%s, %s) AS id", [email, password_hash])["id"]

    def register(self, email: str, name: str | None, password_hash: str) -> str | None:
        """Create a new password account; None if the email already has an account."""
        return self.fetch_one("SELECT lumio_register(%s, %s, %s) AS id",
                              [email, name, password_hash])["id"]

    def get_password_hash(self) -> str | None:
        row = self.fetch_one("SELECT password_hash FROM users")
        return row["password_hash"] if row else None

    def clear_password_hash(self) -> None:
        """Remove the current user's password (RLS-scoped)."""
        self.execute(
            "UPDATE users SET password_hash = NULL, password_updated_at = NULL WHERE id = %s",
            [self.user_id],
        )

    def set_password_hash(self, password_hash: str) -> None:
        """Update the current user's own hash (RLS-scoped)."""
        self.execute(
            "UPDATE users SET password_hash = %s, password_updated_at = NOW() WHERE id = %s",
            [password_hash, self.user_id],
        )

    def update_user(self, fields: dict) -> dict:
        return self._update("users", self.user_id, fields,
                            {"name", "gender", "age", "language"}, self._USER_COLS)

    # -- notes ------------------------------------------------------------------

    def list_notes(self) -> list[dict]:
        return self.fetch_all(f"SELECT {self._NOTE_COLS} FROM notes ORDER BY created_at")

    def create_note(self, content: str) -> dict:
        return self.fetch_one(
            f"INSERT INTO notes (user_id, content) VALUES (%s, %s) RETURNING {self._NOTE_COLS}",
            [self.user_id, content],
        )

    def update_note(self, note_id: str, content: str) -> dict | None:
        return self.fetch_one(
            f"UPDATE notes SET content = %s WHERE id = %s RETURNING {self._NOTE_COLS}",
            [content, note_id],
        )

    def delete_note(self, note_id: str) -> None:
        self.execute("DELETE FROM notes WHERE id = %s", [note_id])

    # -- tasks ---------------------------------------------------------------------

    def list_tasks(self) -> list[dict]:
        return self.fetch_all(f"SELECT {self._TASK_COLS} FROM tasks ORDER BY created_at")

    def create_task(self, title: str) -> dict:
        return self.fetch_one(
            f"INSERT INTO tasks (user_id, title) VALUES (%s, %s) RETURNING {self._TASK_COLS}",
            [self.user_id, title],
        )

    def update_task(self, task_id: str, fields: dict) -> dict | None:
        return self._update("tasks", task_id, fields, {"title", "done"}, self._TASK_COLS)

    def delete_task(self, task_id: str) -> None:
        self.execute("DELETE FROM tasks WHERE id = %s", [task_id])

    # -- calendar --------------------------------------------------------------------

    def list_events(self) -> list[dict]:
        return self.fetch_all(f"SELECT {self._EVENT_COLS} FROM calendar_events ORDER BY start_time")

    def create_event(self, ev: dict) -> dict:
        return self.fetch_one(
            "INSERT INTO calendar_events"
            " (user_id, title, description, start_time, end_time, all_day, color)"
            f" VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING {self._EVENT_COLS}",
            [self.user_id, ev["title"], ev.get("description") or "", ev["start_time"],
             ev["end_time"], bool(ev.get("all_day")), ev.get("color") or "#3b82f6"],
        )

    def update_event(self, event_id: str, fields: dict) -> dict | None:
        return self._update("calendar_events", event_id, fields,
                            {"title", "description", "start_time", "end_time", "all_day", "color"},
                            self._EVENT_COLS)

    def delete_event(self, event_id: str) -> None:
        self.execute("DELETE FROM calendar_events WHERE id = %s", [event_id])

    # -- chats --------------------------------------------------------------------------

    def list_chats(self) -> list[dict]:
        chats = self.fetch_all(f"SELECT {self._CHAT_COLS} FROM chats ORDER BY updated_at DESC")
        return [self._chat_with_messages(c) for c in chats]

    def get_chat(self, chat_id: str) -> dict | None:
        chat = self.fetch_one(f"SELECT {self._CHAT_COLS} FROM chats WHERE id = %s", [chat_id])
        return None if chat is None else self._chat_with_messages(chat)

    def _chat_with_messages(self, chat: dict) -> dict:
        msgs = self.fetch_all(
            f"SELECT {self._MSG_COLS} FROM messages WHERE chat_id = %s"
            " ORDER BY sent_at, role DESC",
            [chat["id"]],
        )
        return {"chat_id": chat["id"], "title": chat["title"],
                "created_at": chat["created_at"], "updated_at": chat["updated_at"],
                "messages": msgs}

    def create_chat(self, title: str) -> dict:
        chat = self.fetch_one(
            f"INSERT INTO chats (user_id, title) VALUES (%s, %s) RETURNING {self._CHAT_COLS}",
            [self.user_id, title],
        )
        return self._chat_with_messages(chat)

    def append_exchange(self, chat_id: str, prompt: str, answer: str,
                        sources: list | None = None) -> str:
        row = self.fetch_one("SELECT id FROM chats WHERE id = %s", [chat_id])
        if row is None:
            chat_id = self.fetch_one(
                "INSERT INTO chats (user_id, title) VALUES (%s, %s) RETURNING id",
                [self.user_id, prompt[:80]],
            )["id"]
        else:
            self.execute("UPDATE chats SET updated_at = NOW() WHERE id = %s", [chat_id])
        # Both messages share the transaction's NOW(); role DESC keeps user first.
        for role, content, src in (("user", prompt, None), ("assistant", answer, sources)):
            self.execute(
                "INSERT INTO messages (user_id, chat_id, role, content, sources)"
                " VALUES (%s, %s, %s, %s, %s)",
                [self.user_id, chat_id, role, content, Jsonb(src or [])],
            )
        return chat_id

    def delete_chat(self, chat_id: str) -> None:
        self.execute("DELETE FROM chats WHERE id = %s", [chat_id])

    # -- documents -------------------------------------------------------------------------

    def list_documents(self) -> list[dict]:
        return self.fetch_all(f"SELECT {self._DOC_COLS} FROM documents ORDER BY created_at DESC")

    def get_document(self, document_id: str) -> dict | None:
        return self.fetch_one(f"SELECT {self._DOC_COLS} FROM documents WHERE id = %s", [document_id])

    def insert_document(self, doc_id: str, filename: str, file_type: str,
                        file_size: int, storage_path: str, extracted_text: str = "") -> dict:
        return self.fetch_one(
            "INSERT INTO documents"
            " (user_id, id, filename, file_type, file_size, storage_path, extracted_text)"
            f" VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING {self._DOC_COLS}",
            [self.user_id, doc_id, filename, file_type, file_size, storage_path, extracted_text],
        )

    def delete_document(self, document_id: str) -> None:
        self.execute("DELETE FROM documents WHERE id = %s", [document_id])
