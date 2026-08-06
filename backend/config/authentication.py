from django.conf import settings
from rest_framework.authentication import BaseAuthentication


class DevAuthentication(BaseAuthentication):
    def authenticate(self, request):
        if settings.DEBUG:
            from accounts.models import User
            user = User.objects.filter(email='diogolbsilva2006@gmail.com').first()
            if user:
                return (user, None)
        return None
