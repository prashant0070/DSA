package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Two pointers (left/right max) or monotonic stack
 * Target: O(n) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.advanced.TrappingRainWater}
 */
public final class TrappingRainWater {

    public static int trap(int[] height) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", trap(new int[] {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}) == 6);
        failed += Checks.check("empty", trap(new int[] {}) == 0);
        failed += Checks.check("flat", trap(new int[] {2, 2, 2}) == 0);
        Checks.printResult(failed);
    }
}
