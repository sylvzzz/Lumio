from unittest.mock import patch

from django.test import SimpleTestCase, TestCase, override_settings

from chat import llm


@override_settings(
    GROQ_API_KEY='g',
    GROQ_API_BASE='https://api.groq.com/openai/v1',
    GROQ_LLM_MODEL='openai/gpt-oss-120b',
    NVIDIA_API_KEY='n',
    NVIDIA_API_BASE='https://integrate.api.nvidia.com/v1',
    NVIDIA_EMBEDDING_MODEL='nvidia/nemotron-3-embed-1b',
)
class LlmTests(SimpleTestCase):
    @patch('chat.llm.requests.post')
    def test_embed_text_uses_nvidia_embeddings(self, post):
        post.return_value.json.return_value = {'data': [{'embedding': [0.1, 0.2]}]}

        self.assertEqual(llm.embed_text('hi'), [0.1, 0.2])

        self.assertEqual(post.call_args.args[0], 'https://integrate.api.nvidia.com/v1/embeddings')
        body = post.call_args.kwargs['json']
        self.assertEqual(body['model'], 'nvidia/nemotron-3-embed-1b')
        self.assertEqual(body['input_type'], 'passage')

        llm.embed_text('hi', input_type='query')
        self.assertEqual(post.call_args.kwargs['json']['input_type'], 'query')

    @patch('chat.llm.requests.post')
    def test_chat_completion_uses_groq_chat(self, post):
        post.return_value.json.return_value = {'choices': [{'message': {'content': 'oi'}}]}

        out = llm.chat_completion([{'role': 'user', 'content': 'oi'}], system_prompt='sys')

        self.assertEqual(out, 'oi')
        self.assertEqual(post.call_args.args[0], 'https://api.groq.com/openai/v1/chat/completions')
        body = post.call_args.kwargs['json']
        self.assertEqual(body['model'], 'openai/gpt-oss-120b')
        self.assertEqual(body['messages'][0], {'role': 'system', 'content': 'sys'})

    @override_settings(GROQ_API_KEY='', NVIDIA_API_KEY='')
    def test_disabled_without_keys(self):
        self.assertIsNone(llm.embed_text('hi'))
        self.assertIsNone(llm.chat_completion([{'role': 'user', 'content': 'hi'}]))


@override_settings(NVIDIA_API_KEY='')
class SearchFallbackTests(TestCase):
    def test_uploaded_content_available_without_embedding(self):
        from accounts.models import User
        from documents.models import Document
        from chat.services import search_similar_content

        user = User.objects.create_user(username='t', email='t@example.com', password='x')
        doc = Document.objects.create(
            user=user, filename='f.txt', file_type='txt', file_size=1,
            storage_path='/tmp/f', extracted_text='hello world',
        )

        results = search_similar_content(user, None)

        self.assertTrue(any(r['id'] == str(doc.id) for r in results))
