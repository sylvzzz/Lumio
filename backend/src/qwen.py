"""Grounded answer generation with Groq via OpenAI-compatible API."""
import os
import re
from typing import Any, List

from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

from .models import MinimalSource

MAX_CONTEXT_CHARS = 20000
MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_CHARS = 2000
RANK_HEADING = re.compile(r"^rank\s+\d+$", re.IGNORECASE)
TABLE_ROW = re.compile(
    r"^(?P<item>.+?)\s+(?P<grade>\d+)\s+(?P<hours>\d+)\s*H\s*$"
)
SYSTEM_PROMPT = (
    "You are the assistant of a document chat platform. Users upload "
    "documents that are split into chunks and indexed, and the relevant "
    "chunks are given to you as sources. Answer questions using those "
    "sources when they are relevant. Use the conversation history to "
    "understand follow-up questions. If the sources do not contain the "
    "answer, say you do not know instead of making it up. You may reply "
    "normally to greetings and small talk. Be concise."
    "Answer in the same language as the user prompt"
)


class Model:
    """Answer questions from retrieved sources using Groq."""

    def __init__(self, model_name: str | None = None) -> None:
        """Create the Groq/OpenAI client."""
        api_key = (
            os.environ.get("LLM_API_KEY")
            or os.environ.get("GROQ_API_KEY")
            or os.environ.get("OPENAI_API_KEY")
        )
        if not api_key:
            raise RuntimeError("LLM_API_KEY or GROQ_API_KEY not set")

        self.client = OpenAI(
            base_url=os.environ.get(
                "LLM_BASE_URL", "https://api.groq.com/openai/v1"
            ),
            api_key=api_key,
        )
        self.model_name = (
            model_name
            or os.environ.get("LLM_MODEL")
            or os.environ.get("MODEL_NAME")
            or "qwen/qwen3.8-27b"
        )

    @staticmethod
    def _label_table(text: str, rank: str | None) -> tuple[str, str | None]:
        """Make rank and grade columns explicit for simple table rows."""
        lines: List[str] = []
        for line in text.splitlines():
            heading = RANK_HEADING.match(line.strip())
            if heading:
                rank = heading.group(0)
                lines.append(line)
                continue
            row = TABLE_ROW.match(line)
            if row and rank:
                lines.append(
                    f"{rank} | {row['item']} | grade: {row['grade']} "
                    f"| workload: {row['hours']} H"
                )
            else:
                lines.append(line)
        return "\n".join(lines), rank

    @staticmethod
    def format_sources(sources: List[MinimalSource]) -> str:
        blocks: List[str] = []
        total = 0
        ranks: dict[str, str] = {}
        sources = sorted(
            sources, key=lambda s: (s.file_path, s.first_character_index)
        )
        for i, source in enumerate(sources):
            content, new_rank = Model._label_table(
                source.content, ranks.get(source.file_path)
            )
            if new_rank is not None:
                ranks[source.file_path] = new_rank
            block = f"[{i + 1}] {source.file_path}\n{content}"
            if total + len(block) > MAX_CONTEXT_CHARS:
                if not blocks:
                    blocks.append(block[:MAX_CONTEXT_CHARS])
                break
            blocks.append(block)
            total += len(block)
        return "\n\n".join(blocks)

    def answer(self, question: str, sources: List[MinimalSource],
               history: List[dict[str, Any]] | None = None) -> str:
        user = (
            f"Sources:\n{self.format_sources(sources)}\n\n"
            f"Question: {question}"
        )
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]
        for message in (history or [])[-MAX_HISTORY_MESSAGES:]:
            role = message.get("role")
            content = message.get("content")
            if not isinstance(content, str) or not content.strip():
                continue
            content = content[:MAX_HISTORY_CHARS]
            if role == "user":
                messages.append({"role": "user", "content": content})
            elif role == "assistant":
                messages.append(
                    {"role": "assistant", "content": content}
                )
        messages.append({"role": "user", "content": user})
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0,
        )
        text = response.choices[0].message.content
        return text.strip() if text else ""


Qwen = Model


if __name__ == "__main__":
    demo_source = MinimalSource(
        file_path="demo.md",
        first_character_index=0,
        last_character_index=52,
        content="vLLM serves models through an OpenAI-compatible server.",
    )
    print(Model().answer("How does vLLM serve models?", [demo_source]))
