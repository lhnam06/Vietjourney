CREATE TABLE IF NOT EXISTS timelines (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    visibility VARCHAR(30) NOT NULL,
    owner_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timelines_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_timelines_owner_id ON timelines (owner_id);
CREATE INDEX IF NOT EXISTS idx_timelines_visibility ON timelines (visibility);

CREATE TABLE IF NOT EXISTS timeline_members (
    id VARCHAR(36) PRIMARY KEY,
    timeline_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timeline_members_timeline FOREIGN KEY (timeline_id) REFERENCES timelines (id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_members_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_timeline_member UNIQUE (timeline_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_members_timeline_id ON timeline_members (timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_members_user_id ON timeline_members (user_id);

CREATE TABLE IF NOT EXISTS timeline_events (
    id VARCHAR(36) PRIMARY KEY,
    timeline_id VARCHAR(36) NOT NULL,
    external_place_id VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    order_index INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR(30) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_timeline_events_timeline FOREIGN KEY (timeline_id) REFERENCES timelines (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_timeline_start ON timeline_events (timeline_id, start_time);
CREATE INDEX IF NOT EXISTS idx_timeline_events_timeline_end ON timeline_events (timeline_id, end_time);
