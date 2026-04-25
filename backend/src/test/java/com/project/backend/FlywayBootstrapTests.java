package com.project.backend;

import com.project.backend.modules.auth.repository.RoleRepository;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("flyway-test")
class FlywayBootstrapTests {
    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    TimelineRepository timelineRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads_withFlywayBootstrapFromEmptyDatabase() {
        assertThat(roleRepository.existsById("ADMIN")).isTrue();
        assertThat(roleRepository.existsById("USER")).isTrue();
        assertThat(userRepository.findByUsername("admin")).isPresent();
        assertThat(timelineRepository.count()).isZero();
        assertThat(tableExists("invalidated_token")).isTrue();
        assertThat(tableExists("timelines")).isTrue();
        assertThat(tableExists("timeline_members")).isTrue();
        assertThat(tableExists("timeline_events")).isTrue();
        assertThat(tableExists("notifications")).isTrue();
        assertThat(tableExists("notification_preferences")).isTrue();
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from INFORMATION_SCHEMA.TABLES
                where TABLE_NAME = ?
                """,
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }
}
