package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: plus-one with carry.
 * Digits of a non-negative integer, most significant first. Add one.
 * If the last digit is 9, it becomes 0 and carry walks left. All 9s → extra 1 at front.
 *
 * Run: {@code java -cp out dsa.practice.easy.PlusOne}
 */
public final class PlusOne {

    public static int[] plusOne(int[] digits) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("no carry", Checks.same(plusOne(new int[] {1, 2, 3}), new int[] {1, 2, 4}));
        failed += Checks.check("carry", Checks.same(plusOne(new int[] {1, 9}), new int[] {2, 0}));
        failed += Checks.check("all nines", Checks.same(plusOne(new int[] {9, 9}), new int[] {1, 0, 0}));
        Checks.printResult(failed);
    }
}
