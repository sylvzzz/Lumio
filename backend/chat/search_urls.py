from django.urls import path
from .search import search

urlpatterns = [
    path('', search, name='global-search'),
]
