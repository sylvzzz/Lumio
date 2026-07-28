# Features

## v1.0 (MVP)

### Inbox
- Connect Gmail / Outlook via OAuth
- Display emails in a unified inbox
- Search emails
- AI can read and answer questions about emails

### Notes
- Simple text notes (e.g., "remember to take out trash", "call Sofia later")
- Create, edit, delete
- AI can read and reference notes

### Documents
- User-uploaded files: PDF, CSV, TXT
- Folder organization
- Upload button + drag-and-drop
- Search across documents
- AI can read and answer questions about document contents

### Calendar
- Lumio's own internal calendar (events stored in DB)
- Display calendar view (day/week/month)
- AI can answer "what's my schedule?" based on stored events
- Calendar events created manually in v1.0 (AI cannot create events yet)

### AI Chatbot ("Hey Lumio")
- Persistent chat interface, accessible from anywhere in the app
- Context-aware across notes, documents, emails, and calendar
- RAG pipeline: embed content → pgvector → retrieve → LLM response
- Answers questions, summarizes, finds information
- Powered by Nvidia free-tier LLM

### Authentication
- Google OAuth login
- Session management

## Post-v1.0 (Not building yet)

- AI executing actions (create notes, schedule events, send emails)
- Tasks
- More email providers
- Rich text documents / editing
- Mobile app
- Team/collaboration features
