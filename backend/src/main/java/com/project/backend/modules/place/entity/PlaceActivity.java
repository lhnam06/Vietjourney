package com.project.backend.modules.place.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import net.jcip.annotations.Immutable;

@Entity
@Immutable
@Table(name = "places_activity")
public class PlaceActivity extends PlaceBase {}