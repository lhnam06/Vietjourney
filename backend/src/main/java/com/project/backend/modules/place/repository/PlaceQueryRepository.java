package com.project.backend.modules.place.repository;

import com.project.backend.modules.place.dto.request.PlaceFilterRequest;
import jakarta.persistence.Tuple;

import java.util.List;

public interface PlaceQueryRepository {
    List<Tuple> findByFilter(PlaceFilterRequest req);

    long countByFilter(PlaceFilterRequest req);

    List<Tuple> findDistrictsByFilter(PlaceFilterRequest req);
}
