package dsa.practice.medium;

/**
 * LEARN
 * Topic: Strings
 * Pattern: Expand around center (or DP)
 * Target complexity: O(n²) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.LongestPalindromicSubstring}
 */
public final class LongestPalindromicSubstring {

    public static String longestPalindrome(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        String babad = longestPalindrome("babad");
        failed += Checks.check("babad", babad.length() == 3 && (babad.equals("bab") || babad.equals("aba")));
        failed += Checks.check("cbbd", longestPalindrome("cbbd").equals("bb"));
        failed += Checks.check("single", longestPalindrome("a").equals("a"));
        Checks.printResult(failed);
    }
}
