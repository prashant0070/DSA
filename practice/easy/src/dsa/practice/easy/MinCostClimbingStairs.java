package dsa.practice.easy;

/**
 * LEARN
 * Topic: Dynamic programming
 * Logic: min cost to climb. You may start at 0 or 1. From i you pay cost[i] and jump 1 or 2.
 * dp[i] = cost[i] + min(dp[i-1], dp[i-2]). Answer is min of the last two (you can finish from either).
 *
 * Run: {@code java -cp out dsa.practice.easy.MinCostClimbingStairs}
 */
public final class MinCostClimbingStairs {

    public static int minCostClimbingStairs(int[] cost) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a", minCostClimbingStairs(new int[] {10, 15, 20}) == 15);
        failed += Checks.check("b", minCostClimbingStairs(new int[] {1, 100, 1, 1, 1, 100, 1, 1, 100, 1}) == 6);
        Checks.printResult(failed);
    }
}
