    package com.project.backend.config;

    import com.project.backend.constant.RoleConstant;
    import com.project.backend.entity.Role;
    import com.project.backend.entity.User;
    import com.project.backend.repository.RoleRepository;
    import com.project.backend.repository.UserRepository;
    import lombok.AccessLevel;
    import lombok.RequiredArgsConstructor;
    import lombok.experimental.FieldDefaults;
    import lombok.extern.slf4j.Slf4j;
    import org.springframework.boot.ApplicationRunner;
    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;
    import org.springframework.security.crypto.password.PasswordEncoder;

    import java.util.HashSet;

    @Configuration
    @RequiredArgsConstructor
    @Slf4j
    @FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
    public class ApplicationInitConfig {
        PasswordEncoder passwordEncoder;

        @Bean
        ApplicationRunner applicationRunner(UserRepository userRepository, RoleRepository roleRepository) {
            return args -> {
                if (userRepository.findByUsername("admin").isEmpty()) {

                    // Create default roles and store in database (if not exist)
                    Role adminRole = roleRepository.findById(RoleConstant.ADMIN_ROLE)
                            .orElseGet(() -> roleRepository.save(Role.builder()
                                    .name(RoleConstant.ADMIN_ROLE)
                                    .description("Super Admin")
                                    .build()));

                    var roles = new HashSet<Role>();
                    roles.add(adminRole);

                    User user = User.builder()
                            .username("admin")
                            .password(passwordEncoder.encode("admin"))
                            .roles(roles)
                            .build();

                    userRepository.save(user);
                    log.warn("Admin User has been initialized with default password: \"admin\", please change it later ");
                }

                Role userRole = roleRepository.findById(RoleConstant.USER_ROLE)
                        .orElseGet(() -> roleRepository.save(Role.builder()
                                .name(RoleConstant.USER_ROLE)
                                .description("User with account")
                                .build()));

            };
        }
    }
