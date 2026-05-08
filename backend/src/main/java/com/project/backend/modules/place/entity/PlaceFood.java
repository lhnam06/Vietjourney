package com.project.backend.modules.place.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import net.jcip.annotations.Immutable;

@Entity
@Immutable
@Table(name = "places_food")
public class PlaceFood extends PlaceBase {}