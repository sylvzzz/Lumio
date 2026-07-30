from django.conf import settings
from .llm import embed_text, chat_completion


RAG_SYSTEM_PROMPT = """You are Lumio, an AI assistant integrated into the user's personal workspace. You have access to the user's notes, documents, and emails.

You have general knowledge and can answer questions directly. When relevant information is found in the user's workspace, prioritize it and cite the source (e.g., "According to your note..." or "In an email from..."). If nothing relevant is found in the workspace, just answer normally using your own knowledge.

Be concise and helpful.

Relevant workspace context (if any):
{context}"""


def search_similar_content(user, query_embedding: list[float], limit: int = 10) -> list[dict]:
    if not query_embedding:
        return []

    from django.db import connection

    results = []

    if connection.vendor == 'postgresql':
        vector_literal = '[' + ','.join(str(v) for v in query_embedding) + ']'

        queries = [
            (
                'notes',
                "SELECT id, content, 'note' as source_type, content AS text, "
                "embedding <=> %s::vector AS distance "
                "FROM notes_note WHERE user_id = %s AND embedding IS NOT NULL "
                "ORDER BY distance LIMIT %s",
                ['title', 'content'],
            ),
            (
                'documents',
                "SELECT id, filename, 'document' as source_type, extracted_text AS text, "
                "embedding <=> %s::vector AS distance "
                "FROM documents_document WHERE user_id = %s AND embedding IS NOT NULL "
                "ORDER BY distance LIMIT %s",
                ['filename'],
            ),
            (
                'emails',
                "SELECT id, subject, 'email' as source_type, body_text AS text, "
                "embedding <=> %s::vector AS distance "
                "FROM emails_email WHERE account_id IN "
                "(SELECT id FROM emails_emailaccount WHERE user_id = %s) AND embedding IS NOT NULL "
                "ORDER BY distance LIMIT %s",
                ['subject'],
            ),
        ]

        for label, sql, _ in queries:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql, [vector_literal, str(user.id), limit])
                    cols = [c[0] for c in cursor.description]
                    for row in cursor.fetchall():
                        row_data = dict(zip(cols, row))
                        results.append({
                            'id': str(row_data['id']),
                            'text': row_data.get('text', ''),
                            'source_type': row_data['source_type'],
                            'distance': float(row_data['distance']),
                        })
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning('Search failed for %s: %s', label, e)
    else:
        from django.db.models import Q
        from notes.models import Note
        from documents.models import Document
        from emails.models import Email

        for note in Note.objects.filter(user=user)[:limit]:
            results.append({
                'id': str(note.id),
                'text': note.content[:500],
                'source_type': 'note',
                'distance': 0,
            })

        for doc in Document.objects.filter(user=user)[:limit]:
            results.append({
                'id': str(doc.id),
                'text': doc.extracted_text[:500] if doc.extracted_text else '',
                'source_type': 'document',
                'distance': 0,
            })

        for email in Email.objects.filter(account__user=user)[:limit]:
            results.append({
                'id': str(email.id),
                'text': email.body_text[:500] if email.body_text else '',
                'source_type': 'email',
                'distance': 0,
            })

    results.sort(key=lambda r: r['distance'])
    return results[:limit]


def format_context(results: list[dict]) -> str:
    parts = []
    for r in results:
        source_label = r['source_type'].capitalize()
        parts.append(f"[{source_label}] {r['text']}")
    return '\n\n'.join(parts) if parts else 'No relevant content found.'


def answer_question(user, question: str) -> tuple[str | None, list[dict]]:
    query_embedding = embed_text(question)
    if not query_embedding:
        return None, []

    results = search_similar_content(user, query_embedding)
    context = format_context(results)
    system_prompt = RAG_SYSTEM_PROMPT.format(context=context)

    answer = chat_completion(
        messages=[{'role': 'user', 'content': question}],
        system_prompt=system_prompt,
    )

    sources = [
        {'id': r['id'], 'type': r['source_type'], 'relevance': round(1 - r['distance'], 3)}
        for r in results
    ]

    return answer, sources
