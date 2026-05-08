CREATE TABLE IF NOT EXISTS user_place_interactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    place_id VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_place_interactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_place_interactions_user_created ON user_place_interactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_place_interactions_place ON user_place_interactions (place_id, category);

CREATE TABLE IF NOT EXISTS user_tag_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    tag_group VARCHAR(100) NOT NULL,
    tag_value VARCHAR(255) NOT NULL,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_tag_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_user_tag_preference UNIQUE (user_id, tag_group, tag_value)
);

CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_user_score ON user_tag_preferences (user_id, score);

CREATE TABLE IF NOT EXISTS user_district_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    district VARCHAR(255) NOT NULL,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_district_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_user_district_preference UNIQUE (user_id, district)
);

CREATE INDEX IF NOT EXISTS idx_user_district_preferences_user_score ON user_district_preferences (user_id, score);

CREATE TABLE IF NOT EXISTS user_category_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    category VARCHAR(30) NOT NULL,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_category_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_user_category_preference UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_score ON user_category_preferences (user_id, score);
