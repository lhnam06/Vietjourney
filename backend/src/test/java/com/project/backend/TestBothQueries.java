package com.project.backend;

import org.junit.jupiter.api.Test;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class TestBothQueries {
    @Test
    public void testBoth() throws Exception {
        String url = "jdbc:postgresql://REMOVED_SUPABASE_HOST:6543/postgres?prepareThreshold=0";
        String user = "REMOVED_SUPABASE_USERNAME";
        String password = "REMOVED_SUPABASE_PASSWORD";
        
        Class.forName("org.postgresql.Driver");
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String q = "coffee";
            
            // 1. Define SQL for Search Query
            String searchSql = """
                SELECT ranked.id, ranked.name, ranked.keyword_score
                FROM (
                    SELECT p.id, p.name,
                           LEAST(1.0,
                               GREATEST(
                                   CASE WHEN COALESCE(p.normalized_name, '') = ? THEN 1.0 ELSE 0 END,
                                   CASE WHEN COALESCE(p.normalized_name, '') LIKE ? THEN 0.94 ELSE 0 END,
                                   CASE WHEN COALESCE(p.normalized_name, '') LIKE ? THEN 0.78 ELSE 0 END,
                                   COALESCE(similarity(COALESCE(p.normalized_name, ''), ?), 0) * 0.92,
                                   COALESCE(word_similarity(?, COALESCE(p.normalized_name, '')), 0) * 0.84,
                                   COALESCE(ts_rank_cd(to_tsvector('simple', (
                                       COALESCE(p.normalized_name, '') || ' ' ||
                                       COALESCE(lower(p.category), '') || ' ' ||
                                       COALESCE(lower(p.district), '') || ' ' ||
                                       regexp_replace(COALESCE(lower(p.tags), ''), '[^a-z0-9\\s]', ' ', 'g')
                                   )), websearch_to_tsquery('simple', ?)), 0) * 0.5
                               )
                           ) AS keyword_score
                    FROM (
                        SELECT id, name, address, category, district, rating, latitude, longitude, CAST(urls AS text) AS images, CAST(tags AS text) AS tags, CAST(price_range AS text) AS price_range, normalized_name FROM places_food
                        UNION ALL
                        SELECT id, name, address, category, district, rating, latitude, longitude, CAST(urls AS text) AS images, CAST(tags AS text) AS tags, CAST(price_range AS text) AS price_range, normalized_name FROM places_drink
                        UNION ALL
                        SELECT id, name, address, category, district, rating, latitude, longitude, CAST(urls AS text) AS images, CAST(tags AS text) AS tags, CAST(price_range AS text) AS price_range, normalized_name FROM places_activity
                    ) p
                    WHERE (
                        p.normalized_name % ?
                        OR p.normalized_name LIKE ?
                    )
                ) ranked
                WHERE ranked.keyword_score >= 0.18
                ORDER BY ranked.keyword_score DESC
                LIMIT 10 OFFSET 0
            """;
            
            // 2. Define SQL for Count Query
            String countSql = """
                SELECT COUNT(*)
                FROM (
                    SELECT p.id
                    FROM (
                        SELECT id, name, address, category, district, rating, latitude, longitude, CAST(urls AS text) AS images, CAST(tags AS text) AS tags, CAST(price_range AS text) AS price_range, normalized_name FROM places_food
                        UNION ALL
                        SELECT id, name, address, category, district, rating, latitude, longitude, CAST(urls AS text) AS images, CAST(tags AS text) AS tags, CAST(price_range AS text) AS price_range, normalized_name FROM places_drink
                        UNION ALL
                        SELECT id, name, address, category, district, rating, latitude, longitude, CAST(urls AS text) AS images, CAST(tags AS text) AS tags, CAST(price_range AS text) AS price_range, normalized_name FROM places_activity
                    ) p
                    WHERE (
                        p.normalized_name % ?
                        OR p.normalized_name LIKE ?
                    )
                    AND LEAST(1.0,
                        GREATEST(
                            CASE WHEN COALESCE(p.normalized_name, '') = ? THEN 1.0 ELSE 0 END,
                            CASE WHEN COALESCE(p.normalized_name, '') LIKE ? THEN 0.94 ELSE 0 END,
                            CASE WHEN COALESCE(p.normalized_name, '') LIKE ? THEN 0.78 ELSE 0 END,
                            COALESCE(similarity(COALESCE(p.normalized_name, ''), ?), 0) * 0.92,
                            COALESCE(word_similarity(?, COALESCE(p.normalized_name, '')), 0) * 0.84,
                            COALESCE(ts_rank_cd(to_tsvector('simple', (
                                COALESCE(p.normalized_name, '') || ' ' ||
                                COALESCE(lower(p.category), '') || ' ' ||
                                COALESCE(lower(p.district), '') || ' ' ||
                                regexp_replace(COALESCE(lower(p.tags), ''), '[^a-z0-9\\s]', ' ', 'g')
                            )), websearch_to_tsquery('simple', ?)), 0) * 0.5
                        )
                    ) >= 0.18
                ) ranked
            """;

            // Run Search Query
            System.out.println("Running Search Query...");
            long start = System.currentTimeMillis();
            try (PreparedStatement stmt = conn.prepareStatement(searchSql)) {
                stmt.setString(1, q);
                stmt.setString(2, q + "%");
                stmt.setString(3, "%" + q + "%");
                stmt.setString(4, q);
                stmt.setString(5, q);
                stmt.setString(6, q);
                stmt.setString(7, q);
                stmt.setString(8, "%" + q + "%");
                try (ResultSet rs = stmt.executeQuery()) {
                    int count = 0;
                    while (rs.next()) {
                        count++;
                    }
                    long duration = System.currentTimeMillis() - start;
                    System.out.println("Search Query completed in " + duration + " ms");
                }
            }

            // Run Count Query
            System.out.println("Running Count Query...");
            start = System.currentTimeMillis();
            try (PreparedStatement stmt = conn.prepareStatement(countSql)) {
                stmt.setString(1, q);
                stmt.setString(2, "%" + q + "%");
                stmt.setString(3, q);
                stmt.setString(4, q + "%");
                stmt.setString(5, "%" + q + "%");
                stmt.setString(6, q);
                stmt.setString(7, q);
                stmt.setString(8, q);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        long countVal = rs.getLong(1);
                        long duration = System.currentTimeMillis() - start;
                        System.out.println("Count Query returned " + countVal + " in " + duration + " ms");
                    }
                }
            }
        }
    }
}
