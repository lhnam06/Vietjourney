CREATE TABLE chat_messages (
    id VARCHAR(255) PRIMARY KEY,
    timeline_id VARCHAR(255) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    sender_username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_timeline_id ON chat_messages(timeline_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
