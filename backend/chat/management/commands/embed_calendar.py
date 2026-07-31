from django.core.management.base import BaseCommand
from chat.signals import get_embedding_for_content
from calendarevents.models import CalendarEvent


class Command(BaseCommand):
    help = 'Generates embeddings for calendar events that lack them'

    def handle(self, *args, **options):
        events = CalendarEvent.objects.filter(embedding__isnull=True)
        count = 0
        for event in events:
            text = f"{event.title}\n\n{event.description}".strip()
            embedding = get_embedding_for_content(text)
            if embedding:
                CalendarEvent.objects.filter(pk=event.pk).update(embedding=embedding)
                count += 1
        self.stdout.write(self.style.SUCCESS(f'Embedded {count} calendar events'))
