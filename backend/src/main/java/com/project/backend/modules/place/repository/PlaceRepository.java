package com.project.backend.modules.place.repository;

import com.project.backend.modules.place.entity.PlaceFood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlaceRepository extends JpaRepository<PlaceFood, String> {
}
