-- ==========================================
-- EXTENSIONS
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    gender TEXT,
    age INTEGER,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- CHATS
-- ==========================================

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- MESSAGES
-- ==========================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]'::JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- CALENDAR EVENTS
-- ==========================================

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#f97316',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_time >= start_time)
);


-- ==========================================
-- NOTES
-- ==========================================

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- TASKS
-- ==========================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- DOCUMENT FOLDERS
-- ==========================================

CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent UUID REFERENCES document_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- DOCUMENTS
-- ==========================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder UUID REFERENCES document_folders(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    storage_path TEXT NOT NULL,
    extracted_text TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_chats_user_id
ON chats(user_id);

CREATE INDEX idx_messages_user_id
ON messages(user_id);

CREATE INDEX idx_messages_chat_id
ON messages(chat_id);

CREATE INDEX idx_calendar_user_id
ON calendar_events(user_id);

CREATE INDEX idx_notes_user_id
ON notes(user_id);

CREATE INDEX idx_tasks_user_id
ON tasks(user_id);

CREATE INDEX idx_documents_user_id
ON documents(user_id);

CREATE INDEX idx_documents_folder
ON documents(folder);

CREATE INDEX idx_document_folders_user_id
ON document_folders(user_id);


-- ==========================================
-- UPDATED_AT AUTOMATIC TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chats_updated_at
BEFORE UPDATE ON chats
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- RLS POLICIES
-- ==========================================

CREATE POLICY users_isolation ON users
FOR ALL
USING (id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY chats_isolation ON chats
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY messages_isolation ON messages
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY calendar_isolation ON calendar_events
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY notes_isolation ON notes
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY tasks_isolation ON tasks
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY documents_isolation ON documents
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);


CREATE POLICY document_folders_isolation ON document_folders
FOR ALL
USING (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.user_id', TRUE), '')::UUID);
