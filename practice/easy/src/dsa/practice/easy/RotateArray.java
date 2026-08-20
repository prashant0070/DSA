package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: rotate right by {@code k} using reverse.
 * Reverse the whole array, reverse the first {@code k % n} items, reverse the rest.
 * Three reverses beat an extra O(n) buffer. {@code k} may be larger than length.
 *
 * Run: {@code java -cp out dsa.practice.easy.RotateArray}
 */
public final class RotateArray {

    public static void rotate(int[] nums, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("k=3", rotated(new int[] {1, 2, 3, 4, 5, 6, 7}, 3, new int[] {5, 6, 7, 1, 2, 3, 4}));
        failed += Checks.check("k=2", rotated(new int[] {-1, -100, 3, 99}, 2, new int[] {3, 99, -1, -100}));
        failed += Checks.check("k>n", rotated(new int[] {1, 2}, 3, new int[] {2, 1}));
        Checks.printResult(failed);
    }

    private static boolean rotated(int[] nums, int k, int[] expected) {
        rotate(nums, k);
        return Checks.same(nums, expected);
    }
}
