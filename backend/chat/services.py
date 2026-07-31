import re
from django.conf import settings
from .llm import embed_text, chat_completion


RAG_SYSTEM_PROMPT = """You are Lumio, an AI assistant integrated into the user's personal workspace. You have access to the user's notes, documents, emails, calendar events, and tasks.

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
                "title AS _title, description AS _description, "
                "start_time AS _start_time, end_time AS _end_time, all_day AS _all_day, "
                "embedding <=> %s::vector AS distance "
                "FROM calendarevents_calendarevent WHERE user_id = %s AND embedding IS NOT NULL "
                "ORDER BY distance LIMIT %s",
                ['title', 'description'],
            ),
            (
                'tasks',
                "SELECT id, title, 'task' as source_type, "
                "CONCAT(title, CASE WHEN done THEN ' (done)' ELSE ' (pending)' END) AS text, "
                "embedding <=> %s::vector AS distance "
                "FROM tasks_task WHERE user_id = %s AND embedding IS NOT NULL "
                "ORDER BY distance LIMIT %s",
                ['title'],
            ),
        ]

        for label, sql, _ in queries:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql, [vector_literal, str(user.id), limit])
                    cols = [c[0] for c in cursor.description]
                    for row in cursor.fetchall():
                        row_data = dict(zip(cols, row))
                        result = {
                            'id': str(row_data['id']),
                            'text': row_data.get('text', ''),
                            'source_type': row_data['source_type'],
                            'distance': float(row_data['distance']),
                        }
                        for key in ('_title', '_description', '_start_time', '_end_time', '_all_day'):
                            if key in row_data:
                                result[key] = row_data[key]
                        results.append(result)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning('Search failed for %s: %s', label, e)
    else:
        from notes.models import Note
        from documents.models import Document
        from emails.models import Email
        from calendarevents.models import CalendarEvent
        from tasks.models import Task

        by_type: dict[str, list[tuple[str, str]]] = {
            'note': [(str(n.id), n.content[:500]) for n in Note.objects.filter(user=user)[:limit]],
            'document': [(str(d.id), (d.extracted_text or d.filename)[:500]) for d in Document.objects.filter(user=user)[:limit]],
            'email': [(str(e.id), (e.body_text or e.subject)[:500]) for e in Email.objects.filter(account__user=user)[:limit]],
            'calendar': [
                (str(ev.id), (f"{ev.title}\n{ev.description}" if ev.description else ev.title)[:500],
                 {'_title': ev.title, '_description': ev.description,
                  '_start_time': ev.start_time, '_end_time': ev.end_time, '_all_day': ev.all_day})
                for ev in CalendarEvent.objects.filter(user=user)[:limit]
            ],
            'task': [
                (str(t.id), f"{t.title} ({'done' if t.done else 'pending'})"[:500])
                for t in Task.objects.filter(user=user)[:limit]
            ],
        }

        # Interleave the content types so no single workspace item type
        # monopolizes the limited result window (approximates relevance).
        order = ['note', 'document', 'email', 'calendar', 'task']
        index = 0
        while len(results) < limit and any(by_type[t] for t in order):
            label = order[index % len(order)]
            pool = by_type[label]
            if pool:
                id_, text, *extra = pool.pop(0)
                result = {
                    'id': id_,
                    'text': text,
                    'source_type': label,
                    'distance': 0,
                }
                if extra:
                    result.update(extra[0])
                results.append(result)
            index += 1

    # Annotate calendar results with their date so the LLM can tell when each
    # event happens (semantic results alone only carry the title).
    from types import SimpleNamespace
    from django.utils import timezone
    tz = _user_timezone(user)
    now = timezone.now()
    for r in results:
        if r['source_type'] == 'calendar' and r.get('_start_time') is not None:
            event = SimpleNamespace(
                start_time=r['_start_time'],
                end_time=r['_end_time'],
                all_day=bool(r['_all_day']),
            )
            text = f"{r['_title']} — {_event_when(event, now, tz)}"
            if r.get('_description'):
                text += f"\n{r['_description']}"
            r['text'] = text[:500]
            for key in ('_title', '_description', '_start_time', '_end_time', '_all_day'):
                r.pop(key, None)

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

CALENDAR_STOPWORDS = {
    'para', 'por', 'que', 'com', 'tem', 'tenho', 'tenha', 'o', 'a', 'os',
    'as', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'do', 'da', 'dos', 'das',
    'de', 'em', 'e', 'ou', 'mas', 'sobre', 'meu', 'minha', 'meus', 'minhas',
    'the', 'my', 'your', 'our', 'a', 'an', 'of', 'for', 'and', 'or', 'on',
    'in', 'at', 'do', 'does', 'did', 'is', 'are', 'am', 'was', 'have',
    'has', 'had', 'what', 'when', 'where', 'which', 'who', 'how', 'can',
    'qual', 'quais', 'quando', 'onde', 'quem',
}

CALENDAR_INTENT_HINTS = (
    'calendar', 'calendario', 'calendário', 'agenda', 'schedule',
    'event', 'events', 'eventos', 'meeting', 'meetings', 'reuniao',
    'reunião', 'appointment', 'appointments', 'compromissos', 'timeline',
    'plans', 'planos', 'marcado', 'marcada', 'marcados', 'marcadas',
    'marca', 'tenho', 'have', 'agendado', 'agendada', 'booked',
)

MONTH_NAMES = {
    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'março': 3, 'abril': 4,
    'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9,
    'outubro': 10, 'novembro': 11, 'dezembro': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5,
    'june': 6, 'july': 7, 'august': 8, 'september': 9, 'october': 10,
    'november': 11, 'december': 12,
}

WEEKDAY_NAMES = {
    'segunda-feira': 0, 'segunda': 0, 'monday': 0,
    'terca-feira': 1, 'terça-feira': 1, 'terca': 1, 'terça': 1, 'tuesday': 1,
    'quarta-feira': 2, 'quarta': 2, 'wednesday': 2,
    'quinta-feira': 3, 'quinta': 3, 'thursday': 3,
    'sexta-feira': 4, 'sexta': 4, 'friday': 4,
    'sabado': 5, 'sábado': 5, 'saturday': 5,
    'domingo': 6, 'sunday': 6,
}

MONTH_CONTEXT_WORDS = (
    'de ', ' em ', ' no ', ' na ', ' in ', ' on ', ' this ', ' next ',
    ' para ', ' por ', ' ate ', ' até ', 'during', 'durante',
)


def _extract_month_day(lower: str, today) -> tuple[int | None, int | None]:
    """Return (day, month) for an explicit or implicit date reference in the
    question, or (None, None) when nothing matches. `day` may be None for a
    month-only reference."""
    m = re.search(r'\b(\d{1,2})\s+de\s+([a-zà-ÿ]+)', lower)
    if m and m.group(2) in MONTH_NAMES:
        return int(m.group(1)), MONTH_NAMES[m.group(2)]
    m = re.search(r'\b([a-zà-ÿ]+)\s+(\d{1,2})\b', lower)
    if m and m.group(1) in MONTH_NAMES:
        return int(m.group(2)), MONTH_NAMES[m.group(1)]
    m = re.search(r'\b(\d{1,2})\s+([a-zà-ÿ]+)\b', lower)
    if m and m.group(2) in MONTH_NAMES:
        return int(m.group(1)), MONTH_NAMES[m.group(2)]
    m = re.search(r'\bdia\s+(\d{1,2})\b', lower)
    if m:
        return int(m.group(1)), today.month
    for name, num in MONTH_NAMES.items():
        if name in lower:
            return None, num
    return None, None


def _user_timezone(user):
    from zoneinfo import ZoneInfo
    name = getattr(user, 'timezone', '') or settings.TIME_ZONE
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo('UTC')


def detect_calendar_date_range(question: str, now, tz=None) -> tuple | None:
    """Return a (start, end) aware-datetime range for an explicit calendar-date
    reference in the question (a day, weekday, month, or weekend), or None when
    no concrete date is mentioned. Used to boost calendar retrieval and narrow
    results to the exact day the user asks about. `now` should already be in the
    user's timezone and `tz` is that timezone, so the returned range spans the
    user's local day."""
    from datetime import date, datetime, time, timedelta
    from datetime import timezone as dt_timezone
    from django.utils import timezone as dj_timezone

    if tz is None:
        tz = dt_timezone.utc

    lower = question.lower()
    today = now.date()

    def utc_range(start_day, end_day=None):
        end_day = end_day or start_day
        start_local = datetime.combine(start_day, time.min)
        end_local = datetime.combine(end_day, time.max)
        start = dj_timezone.make_aware(start_local, tz).astimezone(dt_timezone.utc)
        end = dj_timezone.make_aware(end_local, tz).astimezone(dt_timezone.utc)
        return start, end

    if 'amanhã' in lower or 'amanha' in lower or 'tomorrow' in lower:
        return utc_range(today + timedelta(days=1))
    if 'ontem' in lower or 'yesterday' in lower:
        return utc_range(today - timedelta(days=1))
    if 'hoje' in lower or 'today' in lower:
        return utc_range(today)

    if 'fim de semana' in lower or 'fim-de-semana' in lower or 'weekend' in lower:
        saturday = today + timedelta(days=(5 - today.weekday()) % 7)
        return utc_range(saturday, saturday + timedelta(days=1))

    for name, weekday in WEEKDAY_NAMES.items():
        if name in lower:
            delta = (weekday - today.weekday()) % 7
            return utc_range(today + timedelta(days=delta))

    day, month = _extract_month_day(lower, today)
    if month is not None:
        if day is None:
            if not any(ctx in lower for ctx in MONTH_CONTEXT_WORDS):
                return None
            start = date(today.year, month, 1)
            if start < today - timedelta(days=60):
                start = date(start.year + 1, month, 1)
            elif start > today + timedelta(days=300):
                start = date(start.year - 1, month, 1)
            next_month = 1 if month == 12 else month + 1
            next_year = start.year + (1 if month == 12 else 0)
            end = date(next_year, next_month, 1) - timedelta(days=1)
            return utc_range(start, end)
        if not 1 <= day <= 31:
            return None
        try:
            target = date(today.year, month, day)
        except ValueError:
            return None
        if target < today - timedelta(days=60):
            target = date(target.year + 1, month, day)
        elif target > today + timedelta(days=300):
            target = date(target.year - 1, month, day)
        return utc_range(target)
    return None


def _event_when(event, now, tz) -> str:
    """Human-readable start description in the user's timezone with a relative
    label so the LLM can tell whether an event is upcoming, today, or past."""
    from django.utils import timezone

    local_now = timezone.localtime(now, tz)
    local_start = timezone.localtime(event.start_time, tz)
    local_end = timezone.localtime(event.end_time, tz)

    delta = (local_now.date() - local_start.date()).days
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
        start_day = local_start.date()
        end_day = local_end.date()
        if start_day != end_day:
            days = f"{start_day.strftime('%A, %B %d')} – {end_day.strftime('%A, %B %d')}"
        else:
            days = start_day.strftime('%A, %B %d')
        return f"{days} ({rel}, all day)"
    start = local_start.strftime('%A, %B %d at %I:%M %p')
    end = local_end.strftime('%I:%M %p')
    return f"{start} – {end} ({rel})"


def get_calendar_context(user, question: str, limit: int = 6) -> list[dict]:
    """Return calendar events that are time-relevant or keyword-match the
    question's tokens. Past events are only included when the question is
    clearly about the past; otherwise only upcoming events are returned."""
    from datetime import timedelta
    from django.db.models import Q
    from django.utils import timezone
    from calendarevents.models import CalendarEvent

    tz = _user_timezone(user)
    now = timezone.now()
    local_now = timezone.localtime(now, tz)
    lower = question.lower()
    date_range = detect_calendar_date_range(question, local_now, tz)
    wants_everything = any(hint in lower for hint in CALENDAR_EVERYTHING_HINTS)

    if date_range:
        window_start, window_end = date_range
    else:
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
    tokens = {
        re.sub(r'[^\w\s]', '', t).lower()
        for t in question.split()
        if len(re.sub(r'[^\w\s]', '', t)) > 2
    }
    tokens -= CALENDAR_STOPWORDS
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
        text = f"{event.title} — {_event_when(event, local_now, tz)}"
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


def _has_calendar_keyword_match(user, question: str) -> bool:
    """True when a meaningful token in the question appears in any event title
    or description, e.g. "quando é o aniversario da bebuxa?". Signals that the
    question is about a specific event the user marked."""
    from django.db.models import Q
    from calendarevents.models import CalendarEvent

    tokens = {
        re.sub(r'[^\w\s]', '', t).lower()
        for t in question.split()
        if len(re.sub(r'[^\w\s]', '', t)) > 2
    } - CALENDAR_STOPWORDS
    if not tokens:
        return False
    q = Q()
    for token in tokens:
        q |= Q(title__icontains=token) | Q(description__icontains=token)
    return CalendarEvent.objects.filter(user=user).filter(q).exists()


FOLLOWUP_HINTS = (
    'só isso', 'so isso', 'e mais', 'mais alguma', 'algo mais', 'outra coisa',
    'e depois', 'e agora', 'e mais alguma', 'anything else', 'what else',
    'alguma coisa', 'e?',
)


def _looks_like_followup(question: str) -> bool:
    lower = question.lower()
    if any(hint in lower for hint in FOLLOWUP_HINTS):
        return True
    return len(question.split()) <= 4


def answer_question(
    user,
    question: str,
    history: list[dict[str, str]] | None = None,
    previous_user_content: str | None = None,
) -> tuple[str | None, list[dict]]:
    from django.utils import timezone

    # Short follow-ups ("só isso?") re-use the previous question for retrieval
    # so the assistant answers about the same day/topic, and skip the generic
    # semantic noise in favor of the date-scoped calendar context + history.
    is_followup = bool(previous_user_content) and _looks_like_followup(question)
    retrieval_question = f"{previous_user_content} {question}" if is_followup else question

    query_embedding = embed_text(retrieval_question)
    if not query_embedding:
        return None, []

    tz = _user_timezone(user)
    local_now = timezone.localtime(timezone.now(), tz)
    results = [] if is_followup else search_similar_content(user, query_embedding)
    lower = retrieval_question.lower()
    calendar_intent = (
        any(hint in lower for hint in CALENDAR_INTENT_HINTS)
        or detect_calendar_date_range(retrieval_question, local_now, tz) is not None
        or _has_calendar_keyword_match(user, retrieval_question)
    )
    calendar_limit = 15 if calendar_intent else 6
    calendar_results = get_calendar_context(user, retrieval_question, limit=calendar_limit)

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

    messages = list(history or []) + [{'role': 'user', 'content': question}]
    answer = chat_completion(
        messages=messages,
        system_prompt=system_prompt,
    )

    sources = [
        {'id': r['id'], 'type': r['source_type'], 'relevance': round(1 - r['distance'], 3)}
        for r in results
    ]

    return answer, sources
