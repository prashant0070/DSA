package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: write-index (slow/fast pointers).
 * Scan with a fast pointer. Whenever you see a non-zero, write it at {@code slow} and bump {@code slow}.
 * After the scan, fill the rest of the array with zeros. Relative order of non-zeros stays the same.
 *
 * Modify {@code nums} in place.
 *
 * Run: {@code java -cp out dsa.practice.easy.MoveZeroes}
 */
public final class MoveZeroes {

    public static void moveZeroes(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("mixed", moved(new int[] {0, 1, 0, 3, 12}, new int[] {1, 3, 12, 0, 0}));
        failed += Checks.check("no zeros", moved(new int[] {1, 2}, new int[] {1, 2}));
        failed += Checks.check("all zeros", moved(new int[] {0, 0}, new int[] {0, 0}));
        Checks.printResult(failed);
    }

    private static boolean moved(int[] input, int[] expected) {
        moveZeroes(input);
        return Checks.same(input, expected);
    }
}
