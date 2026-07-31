from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import UserViewSet
from notes.views import NoteViewSet
from documents.views import DocumentViewSet, DocumentFolderViewSet
from calendarevents.views import CalendarEventViewSet
from emails.views import EmailAccountViewSet, EmailViewSet
from tasks.views import TaskViewSet
from chat.views import ChatSessionViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'notes', NoteViewSet, basename='notes')
router.register(r'document-folders', DocumentFolderViewSet, basename='document-folders')
router.register(r'documents', DocumentViewSet, basename='documents')
router.register(r'calendar-events', CalendarEventViewSet, basename='calendar-events')
router.register(r'email-accounts', EmailAccountViewSet, basename='email-accounts')
router.register(r'emails', EmailViewSet, basename='emails')
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'chat-sessions', ChatSessionViewSet, basename='chat-sessions')
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-messages')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/search/', include('chat.search_urls')),
    path('api-auth/', include('rest_framework.urls')),
]
