package dsa.practice.advanced;

/**
 * LEARN
 * Topic: DP
 * Pattern: dp[i] = ways to decode s[0..i); handle '0' invalid and two-digit 10-26
 * Target: O(n) time, O(n) or O(1) space
 *
 * Run: {@code java -cp out dsa.practice.advanced.DecodeWays}
 */
public final class DecodeWays {

    public static int numDecodings(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("12", numDecodings("12") == 2);
        failed += Checks.check("226", numDecodings("226") == 3);
        failed += Checks.check("06 invalid", numDecodings("06") == 0);
        failed += Checks.check("empty", numDecodings("") == 0);
        Checks.printResult(failed);
    }
}
