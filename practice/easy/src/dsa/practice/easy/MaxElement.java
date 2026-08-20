package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: linear scan — walk once, keep the largest value seen so far.
 *
 * Return the maximum integer in {@code nums}.
 * {@code nums} is never empty.
 *
 * Run: {@code java -cp out dsa.practice.easy.MaxElement}
 */
public final class MaxElement {

    public static int max(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("single", max(new int[] {7}) == 7);
        failed += Checks.check("mixed", max(new int[] {3, 1, 9, 2}) == 9);
        failed += Checks.check("negatives", max(new int[] {-5, -1, -8}) == -1);
        Checks.printResult(failed);
    }
}
