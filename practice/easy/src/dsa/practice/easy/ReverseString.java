package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings
 * Logic: two pointers on a char array — same as {@link ReverseArray}, but with characters.
 *
 * Reverse {@code s} in place.
 *
 * Run: {@code java -cp out dsa.practice.easy.ReverseString}
 */
public final class ReverseString {

    public static void reverse(char[] s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("even", reversed("abcd", "dcba"));
        failed += Checks.check("odd", reversed("hello", "olleh"));
        failed += Checks.check("one", reversed("x", "x"));
        Checks.printResult(failed);
    }

    private static boolean reversed(String input, String expected) {
        char[] chars = input.toCharArray();
        reverse(chars);
        return expected.equals(new String(chars));
    }
}
