package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Sliding window
 * Pattern: Variable window — expand until valid, shrink while valid, track minimum
 * Target: O(n) average time
 *
 * Run: {@code java -cp out dsa.practice.advanced.MinimumWindowSubstring}
 */
public final class MinimumWindowSubstring {

    public static String minWindow(String s, String t) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("example", "BANC".equals(minWindow("ADOBECODEBANC", "ABC")));
        failed += Checks.check("single char", "a".equals(minWindow("a", "a")));
        failed += Checks.check("impossible", "".equals(minWindow("a", "aa")));
        Checks.printResult(failed);
    }
}
