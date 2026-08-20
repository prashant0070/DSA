package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Prefix/suffix product except self
 * Target complexity: O(n) time, O(1) extra space
 *
 * Run: {@code java -cp out dsa.practice.medium.ProductExceptSelf}
 */
public final class ProductExceptSelf {

    public static int[] productExceptSelf(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("no zeros", Checks.same(productExceptSelf(new int[] {1, 2, 3, 4}), new int[] {24, 12, 8, 6}));
        failed += Checks.check("one zero", Checks.same(productExceptSelf(new int[] {-1, 1, 0, -3, 3}), new int[] {0, 0, 9, 0, 0}));
        failed += Checks.check("two elements", Checks.same(productExceptSelf(new int[] {2, 3}), new int[] {3, 2}));
        Checks.printResult(failed);
    }
}
