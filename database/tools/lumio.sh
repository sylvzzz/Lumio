-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS
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

-- CHATS
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- CALENDAR EVENTS
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#f97316',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_calendar_user_id ON calendar_events(user_id);

-- ENABLE RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY users_isolation ON users
    USING (id = current_setting('app.user_id', TRUE)::UUID)
    WITH CHECK (id = current_setting('app.user_id', TRUE)::UUID);

-- CHATS POLICIES
CREATE POLICY chats_isolation ON chats
    USING (user_id = current_setting('app.user_id', TRUE)::UUID)
    WITH CHECK (user_id = current_setting('app.user_id', TRUE)::UUID);

-- MESSAGES POLICIES
CREATE POLICY messages_isolation ON messages
    USING (user_id = current_setting('app.user_id', TRUE)::UUID)
    WITH CHECK (user_id = current_setting('app.user_id', TRUE)::UUID);

-- CALENDAR POLICIES
CREATE POLICY calendar_isolation ON calendar_events
    USING (user_id = current_setting('app.user_id', TRUE)::UUID)
    WITH CHECK (user_id = current_setting('app.user_id', TRUE)::UUID);