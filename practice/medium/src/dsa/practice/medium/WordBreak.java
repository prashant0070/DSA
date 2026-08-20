package dsa.practice.medium;

/**
 * LEARN
 * Topic: Dynamic programming
 * Pattern: 1D DP — word break
 * Target complexity: O(n²) time, O(n) space
 *
 * Run: {@code java -cp out dsa.practice.medium.WordBreak}
 */
public final class WordBreak {

    public static boolean wordBreak(String s, String[] wordDict) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("leetcode", wordBreak("leetcode", new String[] {"leet", "code"}));
        failed += Checks.check("catsandog", !wordBreak("catsandog", new String[] {"cats", "dog", "sand", "and", "cat"}));
        failed += Checks.check("applepen", wordBreak("applepenapple", new String[] {"apple", "pen"}));
        Checks.printResult(failed);
    }
}
