package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings
 * Logic: vertical scan (or shortest-string prefix).
 * Compare character {@code i} across every string. Stop at the first mismatch or end of a string.
 * Empty array → {@code ""}.
 *
 * Run: {@code java -cp out dsa.practice.easy.LongestCommonPrefix}
 */
public final class LongestCommonPrefix {

    public static String longestCommonPrefix(String[] strs) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("fl", "fl".equals(longestCommonPrefix(new String[] {"flower", "flow", "flight"})));
        failed += Checks.check("none", "".equals(longestCommonPrefix(new String[] {"dog", "racecar", "car"})));
        failed += Checks.check("one", "alone".equals(longestCommonPrefix(new String[] {"alone"})));
        Checks.printResult(failed);
    }
}
