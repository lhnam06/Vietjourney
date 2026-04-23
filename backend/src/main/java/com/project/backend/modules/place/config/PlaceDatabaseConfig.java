package com.project.backend.modules.place.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class PlaceDatabaseConfig {
    @Bean
    @ConditionalOnProperty(prefix = "place.datasource", name = "enabled", havingValue = "true")
    @ConfigurationProperties("place.datasource")
    DataSourceProperties placeDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    @ConditionalOnProperty(prefix = "place.datasource", name = "enabled", havingValue = "true")
    DataSource placeDataSource(@Qualifier("placeDataSourceProperties") DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "place.datasource", name = "enabled", havingValue = "true")
    JdbcTemplate placeJdbcTemplate(@Qualifier("placeDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
