package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: write-index on a sorted array.
 * Slow pointer is the next unique slot. Fast scans. When nums[fast] != nums[slow-1],
 * copy it forward. Return the new length. The first {@code length} entries must be unique.
 *
 * Run: {@code java -cp out dsa.practice.easy.RemoveDuplicatesSorted}
 */
public final class RemoveDuplicatesSorted {

    public static int removeDuplicates(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("dups", uniquePrefix(new int[] {1, 1, 2}, new int[] {1, 2}));
        failed += Checks.check("more", uniquePrefix(new int[] {0, 0, 1, 1, 1, 2, 2, 3, 3, 4}, new int[] {0, 1, 2, 3, 4}));
        failed += Checks.check("none", uniquePrefix(new int[] {1, 2, 3}, new int[] {1, 2, 3}));
        Checks.printResult(failed);
    }

    private static boolean uniquePrefix(int[] nums, int[] expected) {
        int length = removeDuplicates(nums);
        if (length != expected.length) {
            return false;
        }
        for (int i = 0; i < length; i++) {
            if (nums[i] != expected[i]) {
                return false;
            }
        }
        return true;
    }
}
