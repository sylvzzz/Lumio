from django.contrib import admin
from .models import Document, DocumentFolder

admin.site.register(DocumentFolder)
admin.site.register(Document)
