package dsa.practice.easy;

/**
 * LEARN
 * Topic: Dynamic programming
 * Logic: house robber — pick or skip.
 * You cannot rob two adjacent houses. dp[i] = max(dp[i-1], dp[i-2] + nums[i]).
 * Two variables are enough.
 *
 * Run: {@code java -cp out dsa.practice.easy.HouseRobber}
 */
public final class HouseRobber {

    public static int rob(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a", rob(new int[] {1, 2, 3, 1}) == 4);
        failed += Checks.check("b", rob(new int[] {2, 7, 9, 3, 1}) == 12);
        failed += Checks.check("one", rob(new int[] {3}) == 3);
        Checks.printResult(failed);
    }
}
