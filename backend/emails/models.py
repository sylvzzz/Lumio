import uuid
from django.db import models
from django.conf import settings


class EmailAccount(models.Model):
    PROVIDERS = [
        ('gmail', 'Gmail'),
        ('outlook', 'Outlook'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='email_accounts')
    provider = models.CharField(max_length=10, choices=PROVIDERS)
    email = models.EmailField()
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'provider', 'email']

    def __str__(self):
        return f"{self.email} ({self.provider})"


class Email(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name='emails')
    provider_id = models.CharField(max_length=500)
    thread_id = models.CharField(max_length=500, blank=True)
    subject = models.CharField(max_length=500, blank=True)
    from_email = models.EmailField()
    from_name = models.CharField(max_length=255, blank=True)
    to = models.JSONField(default=list)
    cc = models.JSONField(default=list, blank=True)
    bcc = models.JSONField(default=list, blank=True)
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    embedding = models.JSONField(null=True, blank=True)
    received_at = models.DateTimeField()
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']
        unique_together = ['account', 'provider_id']

    def __str__(self):
        return self.subject or '(no subject)'
