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
        if not self.request.user.is_authenticated:
            return ChatSession.objects.none()
        return ChatSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    authentication_classes = [DevAuthentication, TokenAuthentication, SessionAuthentication]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return ChatMessage.objects.none()
        return ChatMessage.objects.filter(session__user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        timezone = request.data.get('timezone')
        if timezone and user.timezone != timezone:
            user.timezone = timezone
            user.save(update_fields=['timezone'])

        user_msg = serializer.save(role='user')

        history_msgs = list(
            ChatMessage.objects.filter(session=user_msg.session)
            .exclude(pk=user_msg.pk)
            .order_by('-created_at')[:10]
        )[::-1]
        history = [{'role': m.role, 'content': m.content} for m in history_msgs]
        previous_user_content = next(
            (m.content for m in reversed(history_msgs) if m.role == 'user'),
            None,
        )

        ai_answer, sources = answer_question(
            user,
            user_msg.content,
            history=history,
            previous_user_content=previous_user_content,
        )

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
