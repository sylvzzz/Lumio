from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from notes.models import Note
from documents.models import Document
from emails.models import Email
from calendarevents.models import CalendarEvent


@api_view(['GET'])
def search(request):
    q = request.GET.get('q', '').strip()
    if not q:
        return Response({'results': []})

    user = request.user
    results = []

    for note in Note.objects.filter(user=user, content__icontains=q)[:5]:
        results.append({
            'id': str(note.id),
            'type': 'note',
            'title': note.content.split('\n')[0][:80],
            'preview': note.content[:200],
            'url': '/notes',
            'updated_at': note.updated_at.isoformat(),
        })

    for doc in Document.objects.filter(
        user=user,
    ).filter(
        Q(filename__icontains=q) | Q(extracted_text__icontains=q)
    )[:5]:
        results.append({
            'id': str(doc.id),
            'type': 'document',
            'title': doc.filename,
            'preview': (doc.extracted_text or '')[:200],
            'url': '/documents',
            'updated_at': doc.updated_at.isoformat(),
        })

    for email in Email.objects.filter(
        account__user=user,
    ).filter(
        Q(subject__icontains=q) | Q(body_text__icontains=q) | Q(from_name__icontains=q) | Q(from_email__icontains=q)
    )[:5]:
        results.append({
            'id': str(email.id),
            'type': 'email',
            'title': email.subject or '(no subject)',
            'preview': f"{email.from_name or email.from_email}: {(email.body_text or '')[:200]}",
            'url': '/inbox',
            'updated_at': email.received_at.isoformat() if email.received_at else '',
        })

    for event in CalendarEvent.objects.filter(user=user).filter(
        Q(title__icontains=q) | Q(description__icontains=q)
    )[:5]:
        results.append({
            'id': str(event.id),
            'type': 'calendar',
            'title': event.title,
            'preview': event.description or '',
            'url': '/calendar',
            'updated_at': event.updated_at.isoformat(),
        })

    results.sort(key=lambda r: r.get('updated_at', ''), reverse=True)

    return Response({'results': results})
