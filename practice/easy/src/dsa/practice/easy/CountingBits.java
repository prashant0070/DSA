package dsa.practice.easy;

/**
 * LEARN
 * Topic: Dynamic programming + bits
 * Logic: count 1-bits for every number in {@code 0..n}.
 * dp[i] = dp[i >> 1] + (i & 1), or dp[i] = dp[i & (i-1)] + 1.
 * Return an array of length n+1.
 *
 * Run: {@code java -cp out dsa.practice.easy.CountingBits}
 */
public final class CountingBits {

    public static int[] countBits(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("2", Checks.same(countBits(2), new int[] {0, 1, 1}));
        failed += Checks.check("5", Checks.same(countBits(5), new int[] {0, 1, 1, 2, 1, 2}));
        Checks.printResult(failed);
    }
}
