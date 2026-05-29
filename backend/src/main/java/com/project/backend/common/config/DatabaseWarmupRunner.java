package com.project.backend.common.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseWarmupRunner implements ApplicationRunner {

    EntityManager entityManager;

    @Qualifier("placeJdbcTemplate")
    ObjectProvider<JdbcTemplate> placeJdbcTemplateProvider;

    @Override
    public void run(ApplicationArguments args) {
        try {
            entityManager.createNativeQuery("SELECT 1").getSingleResult();
        } catch (Exception e) {
            log.warn("Primary database warmup failed: {}", e.getMessage());
        }

        JdbcTemplate placeJdbcTemplate = placeJdbcTemplateProvider.getIfAvailable();
        if (placeJdbcTemplate != null) {
            try {
                placeJdbcTemplate.queryForObject("SELECT 1", Integer.class);
            } catch (Exception e) {
                log.warn("Place database warmup failed: {}", e.getMessage());
            }
        }

        log.info("Database connection pools warmed up");
    }
}
