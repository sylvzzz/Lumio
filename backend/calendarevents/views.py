from rest_framework import viewsets
from .models import CalendarEvent
from .serializers import CalendarEventSerializer


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        timezone = self.request.data.get('timezone')
        if timezone and self.request.user.timezone != timezone:
            self.request.user.timezone = timezone
            self.request.user.save(update_fields=['timezone'])
        serializer.save(user=self.request.user)
