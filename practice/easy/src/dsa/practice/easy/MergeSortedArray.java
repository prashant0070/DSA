package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: merge from the back (two pointers).
 * {@code nums1} has length {@code m + n} with {@code m} values then zeros.
 * Fill from the last index so you do not overwrite unused values in nums1.
 *
 * Run: {@code java -cp out dsa.practice.easy.MergeSortedArray}
 */
public final class MergeSortedArray {

    public static void merge(int[] nums1, int m, int[] nums2, int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("mix", merged(new int[] {1, 2, 3, 0, 0, 0}, 3, new int[] {2, 5, 6}, 3, new int[] {1, 2, 2, 3, 5, 6}));
        failed += Checks.check("empty nums2", merged(new int[] {1}, 1, new int[] {}, 0, new int[] {1}));
        failed += Checks.check("empty nums1", merged(new int[] {0}, 0, new int[] {1}, 1, new int[] {1}));
        Checks.printResult(failed);
    }

    private static boolean merged(int[] nums1, int m, int[] nums2, int n, int[] expected) {
        merge(nums1, m, nums2, n);
        return Checks.same(nums1, expected);
    }
}
