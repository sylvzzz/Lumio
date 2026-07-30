from django.conf import settings
from django.utils.functional import SimpleLazyObject
from accounts.models import User


def get_dev_user():
    return User.objects.filter(email='alex@lumio.io').first()


class DevAutoAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG and not request.user.is_authenticated:
            request.user = SimpleLazyObject(get_dev_user)
        return self.get_response(request)
