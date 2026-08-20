package dsa.practice.medium;

/**
 * LEARN
 * Topic: Dynamic programming
 * Pattern: 1D DP — minimum coins
 * Target complexity: O(amount × coins) time, O(amount) space
 *
 * Run: {@code java -cp out dsa.practice.medium.CoinChange}
 */
public final class CoinChange {

    public static int coinChange(int[] coins, int amount) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", coinChange(new int[] {1, 2, 5}, 11) == 3);
        failed += Checks.check("impossible", coinChange(new int[] {2}, 3) == -1);
        failed += Checks.check("zero amount", coinChange(new int[] {1}, 0) == 0);
        Checks.printResult(failed);
    }
}
