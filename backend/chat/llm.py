import requests
from django.conf import settings


def embed_text(text: str) -> list[float] | None:
    api_key = settings.NVIDIA_API_KEY
    if not api_key:
        return None

    try:
        resp = requests.post(
            f'{settings.NVIDIA_API_BASE}/embeddings',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'input': text,
                'model': settings.NVIDIA_EMBEDDING_MODEL,
                'input_type': 'query',
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['data'][0]['embedding']
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning('Embedding failed: %s', e)
        return None


def chat_completion(
    messages: list[dict[str, str]],
    system_prompt: str | None = None,
) -> str | None:
    api_key = settings.NVIDIA_API_KEY
    if not api_key:
        return None

    payload = {
        'model': settings.NVIDIA_LLM_MODEL,
        'messages': [],
        'temperature': 0.3,
        'max_tokens': 1024,
    }

    if system_prompt:
        payload['messages'].append({'role': 'system', 'content': system_prompt})

    payload['messages'].extend(messages)

    try:
        resp = requests.post(
            f'{settings.NVIDIA_API_BASE}/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message']['content']
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning('LLM chat failed: %s', e)
        return None
