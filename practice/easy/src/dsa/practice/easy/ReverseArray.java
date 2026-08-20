package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: two pointers — left starts at 0, right at the last index; swap and move inward.
 *
 * Reverse {@code nums} in place. Do not allocate a second array.
 *
 * Run: {@code java -cp out dsa.practice.easy.ReverseArray}
 */
public final class ReverseArray {

    public static void reverse(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("even", reversed(new int[] {1, 2, 3, 4}, new int[] {4, 3, 2, 1}));
        failed += Checks.check("odd", reversed(new int[] {1, 2, 3}, new int[] {3, 2, 1}));
        failed += Checks.check("one", reversed(new int[] {5}, new int[] {5}));
        Checks.printResult(failed);
    }

    private static boolean reversed(int[] input, int[] expected) {
        reverse(input);
        return Checks.same(input, expected);
    }
}
