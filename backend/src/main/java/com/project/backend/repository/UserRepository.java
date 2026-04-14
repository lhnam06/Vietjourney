package com.project.backend.repository;

import com.project.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    boolean existsByUsername(String username); // Username exists check
    Optional<User> findByUsername(String username);
}
