package com.project.backend.modules.search.config;

import java.text.Normalizer;
import java.util.regex.Pattern;

public final class SearchNormalizer {
    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern NON_ALPHANUM = Pattern.compile("[^a-z0-9\\s]");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");

    private SearchNormalizer() {
    }

    public static String normalize(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }

        String normalized = input.toLowerCase().trim();
        normalized = normalized.replace('\u0111', 'd').replace('\u0110', 'd');
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        normalized = DIACRITICS.matcher(normalized).replaceAll("");
        normalized = NON_ALPHANUM.matcher(normalized).replaceAll(" ");
        return MULTI_SPACE.matcher(normalized).replaceAll(" ").trim();
    }
}
