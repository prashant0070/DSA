package dsa.practice.advanced;

/**
 * LEARN
 * Topic: DP
 * Pattern: 0/1 knapsack — can we make sum/2?
 * Target: O(n × sum) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.PartitionEqualSubsetSum}
 */
public final class PartitionEqualSubsetSum {

    public static boolean canPartition(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("yes", canPartition(new int[] {1, 5, 11, 5}));
        failed += Checks.check("no", !canPartition(new int[] {1, 2, 3, 5}));
        failed += Checks.check("two equal", canPartition(new int[] {2, 2}));
        Checks.printResult(failed);
    }
}
