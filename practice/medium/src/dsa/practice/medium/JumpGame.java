package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Greedy — farthest reachable index
 * Target complexity: O(n) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.JumpGame}
 */
public final class JumpGame {

    public static boolean canJump(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("reachable", canJump(new int[] {2, 3, 1, 1, 4}));
        failed += Checks.check("stuck", !canJump(new int[] {3, 2, 1, 0, 4}));
        failed += Checks.check("single", canJump(new int[] {0}));
        Checks.printResult(failed);
    }
}
