from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings


def get_embedding_for_content(content: str) -> list | None:
    if not content or not settings.NVIDIA_API_KEY:
        return None
    from .llm import embed_text
    embedding = embed_text(content)
    if embedding:
        try:
            return [float(v) for v in embedding]
        except (TypeError, ValueError):
            return None
    return None


def connect_signals():
    from notes.models import Note
    from documents.models import Document
    from emails.models import Email
    from calendarevents.models import CalendarEvent

    @receiver(post_save, sender=Note, weak=False)
    def auto_embed_note(sender, instance, created, **kwargs):
        if instance.embedding is not None:
            return
        embedding = get_embedding_for_content(instance.content)
        if embedding:
            Note.objects.filter(pk=instance.pk).update(embedding=embedding)

    @receiver(post_save, sender=Document, weak=False)
    def auto_embed_document(sender, instance, created, **kwargs):
        if instance.embedding is not None:
            return
        text = (instance.extracted_text or instance.filename)[:2000]
        embedding = get_embedding_for_content(text)
        if embedding:
            Document.objects.filter(pk=instance.pk).update(embedding=embedding)

    @receiver(post_save, sender=Email, weak=False)
    def auto_embed_email(sender, instance, created, **kwargs):
        if instance.embedding is not None:
            return
        text = f"{instance.subject}\n\n{instance.body_text}"[:2000]
        embedding = get_embedding_for_content(text)
        if embedding:
            Email.objects.filter(pk=instance.pk).update(embedding=embedding)

    @receiver(post_save, sender=CalendarEvent, weak=False)
    def auto_embed_calendar_event(sender, instance, created, **kwargs):
        if instance.embedding is not None:
            return
        text = f"{instance.title}\n\n{instance.description}"[:2000]
        embedding = get_embedding_for_content(text)
        if embedding:
            CalendarEvent.objects.filter(pk=instance.pk).update(embedding=embedding)

    from notes.models import Note
    from documents.models import Document
    from emails.models import Email
    from calendarevents.models import CalendarEvent
    post_save.connect(auto_embed_note, sender=Note, weak=False)
    post_save.connect(auto_embed_document, sender=Document, weak=False)
    post_save.connect(auto_embed_email, sender=Email, weak=False)
    post_save.connect(auto_embed_calendar_event, sender=CalendarEvent, weak=False)
