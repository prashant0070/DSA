package dsa.practice.easy;

/**
 * LEARN
 * Topic: Sliding window
 * Logic: fixed-size window of length {@code k}.
 * Sum the first k, then slide: add nums[i], drop nums[i-k], keep the max sum.
 * O(n), not O(n*k). {@code k} is at least 1 and at most nums.length.
 *
 * Run: {@code java -cp out dsa.practice.easy.MaxSumOfK}
 */
public final class MaxSumOfK {

    public static int maxSum(int[] nums, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("k=2", maxSum(new int[] {1, 4, 2, 10, 23, 3, 1, 0, 20}, 4) == 39);
        failed += Checks.check("k=1", maxSum(new int[] {5, 1, 9}, 1) == 9);
        failed += Checks.check("whole", maxSum(new int[] {2, 3}, 2) == 5);
        Checks.printResult(failed);
    }
}
