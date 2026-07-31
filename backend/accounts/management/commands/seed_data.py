from datetime import datetime, timedelta, timezone
from django.core.management.base import BaseCommand
from django.utils import timezone as tz
from accounts.models import User
from notes.models import Note
from calendarevents.models import CalendarEvent
from documents.models import Document, DocumentFolder
from emails.models import EmailAccount, Email
from chat.models import ChatSession, ChatMessage


class Command(BaseCommand):
    help = 'Seeds the database with mock data for development'

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            email='alex@lumio.io',
            defaults={
                'username': 'alex',
                'first_name': 'Alex',
                'last_name': 'Morgan',
            },
        )
        if created:
            user.set_password('password123')
            user.save()
            self.stdout.write(self.style.SUCCESS('Created user: alex@lumio.io'))

        now = tz.now()

        # Notes
        notes_data = [
            {'content': 'Q4 Planning\nDiscuss goals, budget and timeline with the team. Focus on AI features and market expansion.'},
            {'content': 'Meeting Notes\nDesign system migration proposal. Migrate from legacy components to new design system by end of Q1.'},
            {'content': 'Ideas\nAI features for Lumio v2: Smart email categorization, automated meeting summaries, intelligent document tagging.'},
        ]
        for data in notes_data:
            Note.objects.get_or_create(user=user, content=data['content'])
        self.stdout.write(self.style.SUCCESS('Seeded 3 notes'))

        # Calendar events
        def on_day(days, hour, minute):
            return (now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    + timedelta(days=days))

        events_data = [
            {'title': 'Project standup', 'start_time': on_day(0, 10, 0), 'end_time': on_day(0, 10, 30), 'color': '#0071e3'},
            {'title': 'Design review', 'start_time': on_day(0, 14, 0), 'end_time': on_day(0, 15, 0), 'color': '#ff9f0a'},
            {'title': 'Client call', 'start_time': on_day(1, 16, 30), 'end_time': on_day(1, 17, 0), 'color': '#30d158'},
            {'title': 'Team offsite', 'start_time': on_day(3, 11, 0), 'end_time': on_day(3, 13, 0), 'color': '#af52de'},
            {'title': 'Product launch review', 'start_time': on_day(7, 15, 0), 'end_time': on_day(7, 16, 0), 'color': '#ff3b30'},
        ]
        for data in events_data:
            CalendarEvent.objects.update_or_create(
                user=user, title=data['title'],
                defaults={k: v for k, v in data.items() if k != 'title'},
            )
        self.stdout.write(self.style.SUCCESS('Seeded 5 calendar events'))

        # Document folders
        folder, _ = DocumentFolder.objects.get_or_create(user=user, name='Work Documents')
        DocumentFolder.objects.get_or_create(user=user, name='Personal')

        # Documents
        docs_data = [
            {'filename': 'Project Proposal.pdf', 'file_type': 'pdf', 'file_size': 245000, 'storage_path': 'docs/proposal.pdf', 'extracted_text': 'Project proposal for Lumio AI workspace platform.'},
            {'filename': 'Budget 2026.csv', 'file_type': 'csv', 'file_size': 12000, 'storage_path': 'docs/budget.csv', 'extracted_text': 'Q1, Q2, Q3, Q4 budget allocations.'},
            {'filename': 'Design Mockup.png', 'file_type': 'pdf', 'file_size': 2800000, 'storage_path': 'docs/mockup.png', 'extracted_text': ''},
        ]
        for data in docs_data:
            Document.objects.get_or_create(user=user, folder=folder, **data)
        self.stdout.write(self.style.SUCCESS('Seeded 3 documents'))

        # Email account
        account, _ = EmailAccount.objects.get_or_create(
            user=user,
            provider='gmail',
            email='alex@lumio.io',
            defaults={'access_token': 'mock-token'},
        )

        # Emails
        emails_data = [
            {'provider_id': 'msg1', 'thread_id': 'thread1', 'subject': 'Project meeting tomorrow', 'from_email': 'sarah@company.io', 'from_name': 'Sarah Chen', 'to': ['alex@lumio.io'], 'body_text': 'Hey Alex, just a reminder about the project meeting tomorrow at 10am.', 'received_at': now - timedelta(minutes=2), 'is_read': False},
            {'provider_id': 'msg2', 'thread_id': 'thread2', 'subject': 'Interview invitation', 'from_email': 'recruiting@google.com', 'from_name': 'Google Workspace', 'to': ['alex@lumio.io'], 'body_text': 'We are pleased to invite you for an interview.', 'received_at': now - timedelta(hours=1), 'is_read': False},
            {'provider_id': 'msg3', 'thread_id': 'thread3', 'subject': 'Pull request approved', 'from_email': 'noreply@github.com', 'from_name': 'GitHub', 'to': ['alex@lumio.io'], 'body_text': 'Your pull request #342 has been approved.', 'received_at': now - timedelta(hours=3), 'is_read': True},
            {'provider_id': 'msg4', 'thread_id': 'thread4', 'subject': 'Shared with you', 'from_email': 'noreply@notion.so', 'from_name': 'Notion', 'to': ['alex@lumio.io'], 'body_text': 'Sarah shared a page with you.', 'received_at': now - timedelta(hours=5), 'is_read': True},
        ]
        for data in emails_data:
            Email.objects.get_or_create(account=account, provider_id=data['provider_id'], defaults=data)
        self.stdout.write(self.style.SUCCESS('Seeded 4 emails'))

        # Chat
        session, _ = ChatSession.objects.get_or_create(user=user, title='Demo Chat')
        chat_data = [
            {'role': 'user', 'content': 'Summarize my unread emails.'},
            {'role': 'assistant', 'content': "You have five unread emails. The most important ones are:\n\n• Project meeting tomorrow.\n• Interview invitation.\n\nWould you like me to create a calendar event for the meeting?"},
            {'role': 'user', 'content': 'Yes.'},
            {'role': 'assistant', 'content': "Done. I've added the meeting to your calendar and created a reminder 30 minutes beforehand."},
        ]
        for data in chat_data:
            ChatMessage.objects.get_or_create(session=session, **data)
        self.stdout.write(self.style.SUCCESS('Seeded 4 chat messages'))

        self.stdout.write(self.style.SUCCESS('Database seeding complete!'))
