CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE places_food
    ADD COLUMN IF NOT EXISTS normalized_name TEXT,
    ADD COLUMN IF NOT EXISTS search_embedding vector(1536);

UPDATE places_food
SET normalized_name = trim(regexp_replace(lower(unaccent(COALESCE(name, ''))), '[^a-z0-9\\s]', ' ', 'g'))
WHERE normalized_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_places_food_normalized_name_trgm
    ON places_food USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_places_food_search_embedding
    ON places_food USING ivfflat (search_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_places_food_fts
    ON places_food USING GIN (
        to_tsvector(
            'simple',
            COALESCE(normalized_name, '') || ' ' ||
            COALESCE(lower(category), '') || ' ' ||
            COALESCE(lower(district), '') || ' ' ||
            regexp_replace(COALESCE(lower(CAST(tags AS text)), ''), '[^a-z0-9\\s]', ' ', 'g')
        )
    );

ALTER TABLE places_drink
    ADD COLUMN IF NOT EXISTS normalized_name TEXT,
    ADD COLUMN IF NOT EXISTS search_embedding vector(1536);

UPDATE places_drink
SET normalized_name = trim(regexp_replace(lower(unaccent(COALESCE(name, ''))), '[^a-z0-9\\s]', ' ', 'g'))
WHERE normalized_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_places_drink_normalized_name_trgm
    ON places_drink USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_places_drink_search_embedding
    ON places_drink USING ivfflat (search_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_places_drink_fts
    ON places_drink USING GIN (
        to_tsvector(
            'simple',
            COALESCE(normalized_name, '') || ' ' ||
            COALESCE(lower(category), '') || ' ' ||
            COALESCE(lower(district), '') || ' ' ||
            regexp_replace(COALESCE(lower(CAST(tags AS text)), ''), '[^a-z0-9\\s]', ' ', 'g')
        )
    );

ALTER TABLE places_activity
    ADD COLUMN IF NOT EXISTS normalized_name TEXT,
    ADD COLUMN IF NOT EXISTS search_embedding vector(1536);

UPDATE places_activity
SET normalized_name = trim(regexp_replace(lower(unaccent(COALESCE(name, ''))), '[^a-z0-9\\s]', ' ', 'g'))
WHERE normalized_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_places_activity_normalized_name_trgm
    ON places_activity USING GIN (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_places_activity_search_embedding
    ON places_activity USING ivfflat (search_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_places_activity_fts
    ON places_activity USING GIN (
        to_tsvector(
            'simple',
            COALESCE(normalized_name, '') || ' ' ||
            COALESCE(lower(category), '') || ' ' ||
            COALESCE(lower(district), '') || ' ' ||
            regexp_replace(COALESCE(lower(CAST(tags AS text)), ''), '[^a-z0-9\\s]', ' ', 'g')
        )
    );
