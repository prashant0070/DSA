package dsa.practice.easy;

/**
 * LEARN
 * Topic: Hashing
 * Logic: seen set.
 * Walk the array. If the value is already in a HashSet, return true.
 * Otherwise add it. If you finish the scan, every value was unique.
 *
 * Run: {@code java -cp out dsa.practice.easy.ContainsDuplicate}
 */
public final class ContainsDuplicate {

    public static boolean containsDuplicate(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("has dup", containsDuplicate(new int[] {1, 2, 3, 1}));
        failed += Checks.check("unique", !containsDuplicate(new int[] {1, 2, 3, 4}));
        failed += Checks.check("all same", containsDuplicate(new int[] {7, 7}));
        Checks.printResult(failed);
    }
}
