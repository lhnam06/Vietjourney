CREATE TABLE IF NOT EXISTS community_posts (
    id VARCHAR(36) PRIMARY KEY,
    timeline_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    caption TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
    copy_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_posts_timeline FOREIGN KEY (timeline_id) REFERENCES timelines (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_posts_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author_created ON community_posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_timeline ON community_posts (timeline_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_status_created ON community_posts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_tags (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    tag VARCHAR(60) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_post_tags_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_post_tag UNIQUE (post_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_community_post_tags_tag ON community_post_tags (tag);

CREATE TABLE IF NOT EXISTS community_post_interactions (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_interactions_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_interactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_post_interaction UNIQUE (post_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_community_interactions_post_type ON community_post_interactions (post_id, type);
CREATE INDEX IF NOT EXISTS idx_community_interactions_user_type ON community_post_interactions (user_id, type);

CREATE TABLE IF NOT EXISTS community_post_ratings (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    rating INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_ratings_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_ratings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_post_rating UNIQUE (post_id, user_id),
    CONSTRAINT ck_community_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_community_ratings_post ON community_post_ratings (post_id);

CREATE TABLE IF NOT EXISTS community_comments (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_comments_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_created ON community_comments (post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_follows (
    id VARCHAR(36) PRIMARY KEY,
    follower_id VARCHAR(36) NOT NULL,
    following_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_follows_follower FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_follows_following FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_follow UNIQUE (follower_id, following_id),
    CONSTRAINT ck_community_follow_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following ON community_follows (following_id);
