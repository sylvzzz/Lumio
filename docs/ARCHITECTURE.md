# Architecture

## System Design

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  React SPA   │────▶│  Django API  │────▶│ PostgreSQL  │
│  (frontend)  │◀────│  (backend)   │◀────│  + pgvector │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Nvidia LLM  │
                    │  (API call)  │
                    └──────────────┘
```

## Frontend (React + Tailwind + shadcn/ui)

- Single-page application
- Persistent AI chat panel (collapsible sidebar or floating)
- Route-based pages: Dashboard, Inbox, Notes, Documents, Calendar
- Global search bar
- shadcn/ui components customized to design spec

## Backend (Django + DRF)

Standard Django REST Framework app structure:

```
backend/
├── lumio/              # Django project settings
├── apps/
│   ├── accounts/       # Auth, users, OAuth
│   ├── notes/          # Notes CRUD
│   ├── documents/      # Document upload + folders
│   ├── calendar/       # Calendar events
│   ├── email/          # Email sync, inbox API
│   └── chat/           # Chat sessions, RAG, LLM integration
├── requirements.txt
├── Dockerfile
└── manage.py
```

## RAG Pipeline

1. User uploads email/doc/note → content extracted
2. Content chunked and embedded (via Nvidia embedding API or open-source model)
3. Embedding stored in pgvector
4. User asks question → question embedded → vector similarity search across all user's content
5. Retrieved chunks + question sent to Nvidia LLM
6. LLM response returned with source references

## Key Design Decisions

- **Monorepo** with `frontend/` and `backend/` at top level
- **Docker compose** for local development
- **pgvector** keeps infrastructure simple (no separate vector DB)
- **Google OAuth** serves dual purpose: login + Gmail API access
- **File storage**: local filesystem for dev, S3-compatible for prod
- **LLM**: API call to Nvidia free tier (no local model inference)
