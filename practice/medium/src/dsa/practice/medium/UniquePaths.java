package dsa.practice.medium;

/**
 * LEARN
 * Topic: Dynamic programming
 * Pattern: 2D DP — grid paths top-left to bottom-right
 * Target complexity: O(m × n) time, O(n) space (or O(m × n))
 *
 * Run: {@code java -cp out dsa.practice.medium.UniquePaths}
 */
public final class UniquePaths {

    public static int uniquePaths(int m, int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("3x7", uniquePaths(3, 7) == 28);
        failed += Checks.check("3x2", uniquePaths(3, 2) == 3);
        failed += Checks.check("1x1", uniquePaths(1, 1) == 1);
        Checks.printResult(failed);
    }
}
