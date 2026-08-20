package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Dutch national flag (0, 1, 2 in place)
 * Target complexity: O(n) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.SortColors}
 */
public final class SortColors {

    public static void sortColors(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        int[] a = {2, 0, 2, 1, 1, 0};
        sortColors(a);
        failed += Checks.check("mixed", Checks.same(a, new int[] {0, 0, 1, 1, 2, 2}));
        int[] b = {2, 0, 1};
        sortColors(b);
        failed += Checks.check("three", Checks.same(b, new int[] {0, 1, 2}));
        int[] c = {0};
        sortColors(c);
        failed += Checks.check("single", Checks.same(c, new int[] {0}));
        Checks.printResult(failed);
    }
}
