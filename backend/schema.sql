-- DDL-схема базы данных PostgreSQL для хранения истории сессий ИИ-ассистента СберБизнес.
-- Поддерживает профилирование клиентов банка, сессии чата и сообщения с метаданными.

-- 1. Таблица профилей пользователей / представителей компаний
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    inn VARCHAR(12) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('director', 'accountant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица диалоговых сессий чата
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    current_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Таблица сообщений диалога
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system', 'operator')),
    content TEXT NOT NULL,
    is_operator_call BOOLEAN DEFAULT FALSE,
    crm_ticket_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации поиска исторических диалогов
CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
