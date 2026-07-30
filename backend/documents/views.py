import os
import uuid
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import Document, DocumentFolder
from .serializers import DocumentSerializer, DocumentFolderSerializer, DocumentUploadSerializer
from .text_extraction import extract_text


class DocumentFolderViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentFolderSerializer

    def get_queryset(self):
        return DocumentFolder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


FILE_TYPE_MAP = {
    '.pdf': 'pdf',
    '.csv': 'csv',
    '.txt': 'txt',
}


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data['file']
        folder_id = serializer.validated_data.get('folder')

        ext = os.path.splitext(file.name)[1].lower()
        file_type = FILE_TYPE_MAP.get(ext)
        if not file_type:
            return Response(
                {'error': f'Unsupported file type: {ext}. Supported: .pdf, .csv, .txt'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_media_dir = os.path.join(settings.MEDIA_ROOT, 'documents', str(request.user.id))
        os.makedirs(user_media_dir, exist_ok=True)

        unique_name = f'{uuid.uuid4().hex}{ext}'
        storage_path = os.path.join(user_media_dir, unique_name)

        with open(storage_path, 'wb+') as f:
            for chunk in file.chunks():
                f.write(chunk)

        extracted_text = extract_text(storage_path)

        folder = None
        if folder_id:
            try:
                folder = DocumentFolder.objects.get(id=folder_id, user=request.user)
            except DocumentFolder.DoesNotExist:
                pass

        doc = Document.objects.create(
            user=request.user,
            folder=folder,
            filename=file.name,
            file_type=file_type,
            file_size=file.size,
            storage_path=storage_path,
            extracted_text=extracted_text,
        )

        return Response(
            DocumentSerializer(doc).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        doc = self.get_object()
        if not os.path.exists(doc.storage_path):
            raise Http404('File not found')
        return FileResponse(
            open(doc.storage_path, 'rb'),
            as_attachment=True,
            filename=doc.filename,
        )
