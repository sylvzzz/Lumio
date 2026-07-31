from django.conf import settings
from .llm import embed_text, chat_completion


RAG_SYSTEM_PROMPT = """You are Lumio, an AI assistant integrated into the user's personal workspace. You have access to the user's notes, documents, emails, and calendar events.

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
            (
                'calendar',
                "SELECT id, title, 'calendar' as source_type, "
                "CONCAT(title, ' ', COALESCE(description, '')) AS text, "
                "embedding <=> %s::vector AS distance "
                "FROM calendarevents_calendarevent WHERE user_id = %s AND embedding IS NOT NULL "
                "ORDER BY distance LIMIT %s",
                ['title', 'description'],
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
        from calendarevents.models import CalendarEvent

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

        for event in CalendarEvent.objects.filter(user=user)[:limit]:
            text = event.title
            if event.description:
                text = f"{text}\n{event.description}"
            results.append({
                'id': str(event.id),
                'text': text[:500],
                'source_type': 'calendar',
                'distance': 0,
            })

    results.sort(key=lambda r: r['distance'])
    return results[:limit]


CALENDAR_PAST_HINTS = (
    'yesterday', 'past', 'passed', 'earlier', 'previous', 'was on', 'went',
    'finished', 'ontem', 'passado', 'anterior', 'terminou', 'atras', 'atrás',
)

CALENDAR_FROM_START_OF_DAY_HINTS = (
    'today', 'today\'s', 'this week', 'this month', 'week', 'month',
    'morning', 'afternoon', 'hoje', 'semana', 'mes', 'mês',
)

CALENDAR_EVERYTHING_HINTS = (
    'everything', 'all', 'full', 'complete', 'whole', 'list', 'lista',
    'tudo', 'todas', 'todos', 'completo', 'completa', 'agenda',
)

CALENDAR_INTENT_HINTS = (
    'calendar', 'calendario', 'calendário', 'agenda', 'schedule',
    'event', 'events', 'eventos', 'meeting', 'meetings', 'reuniao',
    'reunião', 'appointment', 'appointments', 'compromissos', 'timeline',
    'plans', 'planos',
)


def _event_when(event, now) -> str:
    """Human-readable start description with a relative label so the LLM can
    tell whether an event is upcoming, today, or in the past."""
    delta = (now.date() - event.start_time.date()).days
    if delta == 0:
        rel = 'today'
    elif delta == -1:
        rel = 'tomorrow'
    elif delta < 0:
        rel = f'in {-delta} days'
    elif delta == 1:
        rel = 'yesterday'
    else:
        rel = f'{delta} days ago'

    if event.all_day:
        return f"{event.start_time.strftime('%A, %B %d')} ({rel}, all day)"
    start = event.start_time.strftime('%A, %B %d at %I:%M %p')
    end = event.end_time.strftime('%I:%M %p')
    return f"{start} – {end} ({rel})"


def get_calendar_context(user, question: str, limit: int = 6) -> list[dict]:
    """Return calendar events that are time-relevant or keyword-match the
    question's tokens. Past events are only included when the question is
    clearly about the past; otherwise only upcoming events are returned."""
    from datetime import timedelta
    from django.db.models import Q
    from django.utils import timezone
    from calendarevents.models import CalendarEvent

    now = timezone.now()
    lower = question.lower()
    wants_everything = any(hint in lower for hint in CALENDAR_EVERYTHING_HINTS)
    window_end = now + timedelta(days=180 if wants_everything else 30)
    if any(hint in lower for hint in CALENDAR_PAST_HINTS):
        window_start = now - timedelta(days=7)
    elif wants_everything or any(hint in lower for hint in CALENDAR_FROM_START_OF_DAY_HINTS):
        window_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        window_start = now

    upcoming = CalendarEvent.objects.filter(
        user=user,
        end_time__gte=window_start,
        start_time__lte=window_end,
    )[:limit]

    keyword_matches = CalendarEvent.objects.none()
    tokens = [t.lower() for t in question.split() if len(t) > 2]
    if tokens:
        q = Q()
        for token in tokens:
            q |= Q(title__icontains=token) | Q(description__icontains=token)
        keyword_matches = CalendarEvent.objects.filter(user=user).filter(q)[:limit]

    seen_ids: set[str] = set()
    events = []
    for event in list(upcoming) + list(keyword_matches):
        if str(event.id) in seen_ids:
            continue
        seen_ids.add(str(event.id))
        events.append(event)
        if len(events) >= limit:
            break

    results = []
    for event in events:
        text = f"{event.title} — {_event_when(event, now)}"
        if event.description:
            text += f"\n{event.description}"
        results.append({
            'id': str(event.id),
            'text': text,
            'source_type': 'calendar',
            'distance': 0.0,
        })

    return results


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
    calendar_intent = any(hint in question.lower() for hint in CALENDAR_INTENT_HINTS)
    calendar_limit = 15 if calendar_intent else 6
    calendar_results = get_calendar_context(user, question, limit=calendar_limit)

    seen_ids: set[str] = set()
    merged = []
    combined = calendar_results + results if calendar_intent else results + calendar_results
    for r in combined:
        if r['id'] in seen_ids:
            continue
        seen_ids.add(r['id'])
        merged.append(r)
        if len(merged) >= (16 if calendar_intent else 12):
            break
    results = merged

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
