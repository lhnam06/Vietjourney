package com.project.backend.modules.auth.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "roles")
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@ToString
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Role {
    @Id
    @EqualsAndHashCode.Include
    String name;
    String description;

    @ManyToMany
    @ToString.Exclude
    Set<Permission> permissions;
}

