package com.project.backend.common.validator;

public class ValidationRegex {
    public static final String NO_SPACE = "^\\S+$";
    public static final String HAS_DIGIT = "^.*\\d.*";
    public static final String ONLY_KEYBOARD_CHARS = "^[\\x21-\\x7E]+$"; // prevent icons, Unicode chars
    public static final String HAS_LETTER = "^.*[a-zA-Z].*";

    private ValidationRegex(){}; // private constructor to prevent object creation
}
