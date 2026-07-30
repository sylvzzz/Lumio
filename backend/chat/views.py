from rest_framework import viewsets, status
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.response import Response
from config.authentication import DevAuthentication
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .services import answer_question


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    authentication_classes = [DevAuthentication, TokenAuthentication, SessionAuthentication]

    def get_queryset(self):
        return ChatMessage.objects.filter(session__user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        user_msg = serializer.save(role='user')

        ai_answer, sources = answer_question(user, user_msg.content)

        if ai_answer:
            ai_msg = ChatMessage.objects.create(
                session=user_msg.session,
                role='assistant',
                content=ai_answer,
                sources=sources,
            )
            return Response(
                self.get_serializer(user_msg).data
                | {'ai_response': ChatMessageSerializer(ai_msg).data},
                status=status.HTTP_201_CREATED,
            )

        return Response(
            self.get_serializer(user_msg).data,
            status=status.HTTP_201_CREATED,
        )
