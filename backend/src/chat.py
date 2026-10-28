"""Persist chat history in a JSON file."""
import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CHATS_DB = "data/chats_db.json"

_lock = threading.Lock()


def _now() -> str:
    """Return the current UTC time as an ISO string."""
    return datetime.now(timezone.utc).isoformat()


def _read() -> dict[str, Any]:
    """Read the chat database, returning an empty one if unreadable."""
    try:
        with open(CHATS_DB, encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError):
        return {"chats": [], "messages": {}}
    if not isinstance(data, dict):
        return {"chats": [], "messages": {}}
    data.setdefault("chats", [])
    data.setdefault("messages", {})
    return data


def _write(data: dict[str, Any]) -> None:
    """Persist the chat database, replacing the file atomically."""
    path = Path(CHATS_DB)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    with open(temp, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
    temp.replace(path)


def list_chats() -> list[dict[str, Any]]:
    """Return chats sorted by most recently updated."""
    chats = _read().get("chats", [])
    if not isinstance(chats, list):
        return []
    return sorted(
        [c for c in chats if isinstance(c, dict)],
        key=lambda c: c.get("updated_at", ""),
        reverse=True,
    )


def get_chat(chat_id: str) -> dict[str, Any] | None:
    """Return one chat with its messages, or ``None`` if missing."""
    data = _read()
    chats = data.get("chats", [])
    messages = data.get("messages", {})
    if not isinstance(chats, list) or not isinstance(messages, dict):
        return None
    for chat in chats:
        if isinstance(chat, dict) and chat.get("chat_id") == chat_id:
            result = dict(chat)
            history = messages.get(chat_id, [])
            result["messages"] = history if isinstance(history, list) else []
            return result
    return None


def delete_chat(chat_id: str) -> None:
    """Delete a chat and its messages."""
    with _lock:
        data = _read()
        chats = data.get("chats", [])
        messages = data.get("messages", {})
        if isinstance(chats, list):
            data["chats"] = [
                c for c in chats
                if not (isinstance(c, dict) and c.get("chat_id") == chat_id)
            ]
        if isinstance(messages, dict):
            messages.pop(chat_id, None)
        _write(data)


def append_exchange(chat_id: str | None, prompt: str, answer: str, sources: list | None = None) -> str:
    """Append a user/assistant exchange and return the chat id."""
    with _lock:
        data = _read()
        now = _now()
        chat_id = chat_id or str(uuid.uuid4())
        chats = data.get("chats")
        messages = data.get("messages")
        if not isinstance(chats, list):
            chats = []
            data["chats"] = chats
        if not isinstance(messages, dict):
            messages = {}
            data["messages"] = messages

        chat = next(
            (c for c in chats
             if isinstance(c, dict) and c.get("chat_id") == chat_id),
            None,
        )
        if chat is None:
            chat = {
                "chat_id": chat_id,
                "title": prompt[:80],
                "created_at": now,
                "updated_at": now,
            }
            chats.append(chat)
        else:
            chat["updated_at"] = now
            if not chat.get("title"):
                chat["title"] = prompt[:80]

        history = messages.get(chat_id)
        if not isinstance(history, list):
            history = []
            messages[chat_id] = history
        history.append(
            {"role": "user", "content": prompt, "created_at": now}
        )
        history.append(
            {"role": "assistant", "content": answer, "created_at": now, "sources": sources or []}
        )
        _write(data)
    return chat_id
