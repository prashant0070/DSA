package dsa.practice.advanced;

/**
 * LEARN
 * Topic: DP
 * Pattern: Patience sorting with binary search, or DP O(n²)
 * Return length of longest strictly increasing subsequence.
 *
 * Run: {@code java -cp out dsa.practice.advanced.LongestIncreasingSubsequence}
 */
public final class LongestIncreasingSubsequence {

    public static int lengthOfLIS(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("example", lengthOfLIS(new int[] {10, 9, 2, 5, 3, 7, 101, 18}) == 4);
        failed += Checks.check("single", lengthOfLIS(new int[] {1}) == 1);
        failed += Checks.check("decreasing", lengthOfLIS(new int[] {5, 4, 3}) == 1);
        Checks.printResult(failed);
    }
}
