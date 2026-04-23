package com.project.backend.modules.place.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "place.lookup")
public class PlaceLookupProperties {
    String foodTable = "places_food";
    String drinkTable = "places_drink";
    String activityTable = "places_activity";
    String idColumn = "id";
}
