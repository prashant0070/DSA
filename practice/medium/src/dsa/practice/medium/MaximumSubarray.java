package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Kadane / max sum subarray
 * Target complexity: O(n) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.MaximumSubarray}
 */
public final class MaximumSubarray {

    public static int maxSubArray(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("mixed", maxSubArray(new int[] {-2, 1, -3, 4, -1, 2, 1, -5, 4}) == 6);
        failed += Checks.check("single", maxSubArray(new int[] {1}) == 1);
        failed += Checks.check("all positive", maxSubArray(new int[] {5, 4, -1, 7, 8}) == 23);
        Checks.printResult(failed);
    }
}
