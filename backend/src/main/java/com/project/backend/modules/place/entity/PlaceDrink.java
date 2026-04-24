package com.project.backend.modules.place.entity;

import com.project.backend.modules.place.entity.PlaceBase;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import net.jcip.annotations.Immutable;

@Entity
@Immutable
@Table(name = "places_drink")
public class PlaceDrink extends PlaceBase {}