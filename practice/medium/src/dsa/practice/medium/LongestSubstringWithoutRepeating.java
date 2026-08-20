package dsa.practice.medium;

/**
 * LEARN
 * Topic: Strings
 * Pattern: Variable sliding window
 * Target complexity: O(n) time, O(min(n, alphabet)) space
 *
 * Run: {@code java -cp out dsa.practice.medium.LongestSubstringWithoutRepeating}
 */
public final class LongestSubstringWithoutRepeating {

    public static int lengthOfLongestSubstring(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("abcabcbb", lengthOfLongestSubstring("abcabcbb") == 3);
        failed += Checks.check("bbbbb", lengthOfLongestSubstring("bbbbb") == 1);
        failed += Checks.check("pwwkew", lengthOfLongestSubstring("pwwkew") == 3);
        failed += Checks.check("empty", lengthOfLongestSubstring("") == 0);
        Checks.printResult(failed);
    }
}
