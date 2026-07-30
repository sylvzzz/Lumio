from rest_framework import viewsets, permissions
from .models import EmailAccount, Email
from .serializers import EmailAccountSerializer, EmailSerializer


class EmailAccountViewSet(viewsets.ModelViewSet):
    serializer_class = EmailAccountSerializer

    def get_queryset(self):
        return EmailAccount.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmailViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmailSerializer

    def get_queryset(self):
        return Email.objects.filter(account__user=self.request.user)
