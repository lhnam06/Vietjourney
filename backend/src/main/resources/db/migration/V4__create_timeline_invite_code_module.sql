CREATE TABLE IF NOT EXISTS timeline_invite_codes (
    id VARCHAR(36) PRIMARY KEY,
    timeline_id VARCHAR(36) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    role VARCHAR(30) NOT NULL,
    max_uses INTEGER NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_by_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timeline_invite_codes_timeline FOREIGN KEY (timeline_id) REFERENCES timelines (id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_invite_codes_created_by FOREIGN KEY (created_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_invite_codes_timeline_active ON timeline_invite_codes (timeline_id, active);
CREATE INDEX IF NOT EXISTS idx_timeline_invite_codes_code_hash_active ON timeline_invite_codes (code_hash, active);
