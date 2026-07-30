from rest_framework import serializers
from .models import EmailAccount, Email


class EmailAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAccount
        fields = ['id', 'provider', 'email', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Email
        fields = ['id', 'account', 'subject', 'from_email', 'from_name', 'to', 'cc', 'bcc', 'body_text', 'received_at', 'is_read', 'is_starred', 'created_at']
        read_only_fields = ['id', 'created_at']
