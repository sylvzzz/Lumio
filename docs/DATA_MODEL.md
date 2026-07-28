# Data Model

## Users

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | string | Unique |
| name | string | |
| google_id | string | Nullable |
| outlook_id | string | Nullable |
| avatar_url | string | |
| created_at | datetime | |
| updated_at | datetime | |

## Email Accounts

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | FK → users | |
| provider | enum | "gmail" \| "outlook" |
| email | string | |
| access_token | encrypted | OAuth token |
| refresh_token | encrypted | |
| expires_at | datetime | |
| is_active | boolean | |

## Emails

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| account_id | FK → email_accounts | |
| provider_id | string | Gmail/Outlook message ID |
| thread_id | string | |
| subject | string | |
| from_email | string | |
| from_name | string | |
| to | JSON | List of recipients |
| cc | JSON | |
| bcc | JSON | |
| body_text | text | Plain text body |
| body_html | text | HTML body |
| received_at | datetime | |
| is_read | boolean | |
| is_starred | boolean | |
| embedding | vector(1536) | pgvector for RAG |
| created_at | datetime | |

## Notes

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | FK → users | |
| content | text | Simple text |
| is_pinned | boolean | |
| embedding | vector(1536) | pgvector for RAG |
| created_at | datetime | |
| updated_at | datetime | |

## Document Folders

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | FK → users | |
| name | string | |
| parent_id | FK → self | Nullable, for nesting |
| created_at | datetime | |

## Documents

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | FK → users | |
| folder_id | FK → document_folders | Nullable |
| filename | string | Original filename |
| file_type | string | "pdf" \| "csv" \| "txt" |
| file_size | integer | Bytes |
| storage_path | string | Local path or S3 key |
| extracted_text | text | Full text content |
| embedding | vector(1536) | pgvector for RAG |
| created_at | datetime | |
| updated_at | datetime | |

## Calendar Events

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | FK → users | |
| title | string | |
| description | text | |
| start_time | datetime | |
| end_time | datetime | |
| all_day | boolean | |
| color | string | Hex color |
| created_at | datetime | |
| updated_at | datetime | |

## Chat Messages

| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| user_id | FK → users | |
| session_id | UUID | Groups messages into conversations |
| role | enum | "user" \| "assistant" |
| content | text | |
| sources | JSON | References to notes/docs/emails used |
| created_at | datetime | |
