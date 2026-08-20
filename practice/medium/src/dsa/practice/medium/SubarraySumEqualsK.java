package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Prefix sum + hash map count
 * Target complexity: O(n) time, O(n) space
 *
 * Run: {@code java -cp out dsa.practice.medium.SubarraySumEqualsK}
 */
public final class SubarraySumEqualsK {

    public static int subarraySum(int[] nums, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("ones", subarraySum(new int[] {1, 1, 1}, 2) == 2);
        failed += Checks.check("mixed", subarraySum(new int[] {1, 2, 3}, 3) == 2);
        failed += Checks.check("with negatives", subarraySum(new int[] {1, -1, 0}, 0) == 3);
        Checks.printResult(failed);
    }
}
