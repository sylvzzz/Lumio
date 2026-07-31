from django.core.management.base import BaseCommand
from chat.signals import get_embedding_for_content
from tasks.models import Task


class Command(BaseCommand):
    help = 'Generates embeddings for tasks that lack them'

    def handle(self, *args, **options):
        tasks = Task.objects.filter(embedding__isnull=True)
        count = 0
        for task in tasks:
            text = f"{task.title} ({'done' if task.done else 'pending'})"
            embedding = get_embedding_for_content(text)
            if embedding:
                Task.objects.filter(pk=task.pk).update(embedding=embedding)
                count += 1
        self.stdout.write(self.style.SUCCESS(f'Embedded {count} tasks'))
