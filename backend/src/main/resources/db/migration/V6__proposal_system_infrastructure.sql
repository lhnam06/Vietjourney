-- Migration V6: Support for Proposal & Version Control System
-- 1. Add version column to timelines table for optimistic locking and state tracking
ALTER TABLE timelines ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

-- 2. Create timeline_proposals table for suggestion review workflow
CREATE TABLE timeline_proposals (
    id VARCHAR(36) PRIMARY KEY,
    timeline_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    base_version INTEGER NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- e.g., ADD, MOVE, DELETE, UPDATE
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- PENDING, ACCEPTED, REJECTED, OUTDATED
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_proposal_timeline FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
    CONSTRAINT fk_proposal_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for performance when checking a trip's proposals
CREATE INDEX idx_proposal_timeline_id ON timeline_proposals(timeline_id);
CREATE INDEX idx_proposal_status ON timeline_proposals(status);
