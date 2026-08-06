from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.utils.functional import SimpleLazyObject
from accounts.models import User


def get_dev_user():
    if not settings.DEBUG:
        return AnonymousUser()
    user = User.objects.filter(email='diogolbsilva2006@gmail.com').first()
    return user or AnonymousUser()


class DevAutoAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG and not request.user.is_authenticated:
            request.user = SimpleLazyObject(get_dev_user)
        return self.get_response(request)
