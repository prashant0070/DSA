package dsa.practice.easy;

/**
 * LEARN
 * Topic: Hashing
 * Logic: complement map.
 * For each value {@code x} at index {@code i}, you need {@code target - x} from an earlier index.
 * Store {@code value -> index} in a HashMap as you go. One pass, O(n) time.
 * Nested loops (check every pair) also work but are O(n²) — prefer the map.
 *
 * Return the two indices (any order). Exactly one solution exists. You may not reuse the same index.
 *
 * Run: {@code java -cp out dsa.practice.easy.TwoSum}
 */
public final class TwoSum {

    public static int[] twoSum(int[] nums, int target) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("example", solves(new int[] {2, 7, 11, 15}, 9));
        failed += Checks.check("later pair", solves(new int[] {3, 2, 4}, 6));
        failed += Checks.check("duplicates", solves(new int[] {3, 3}, 6));
        Checks.printResult(failed);
    }

    private static boolean solves(int[] nums, int target) {
        int[] idx = twoSum(nums, target);
        if (idx == null || idx.length != 2) {
            return false;
        }
        int i = idx[0];
        int j = idx[1];
        if (i == j || i < 0 || j < 0 || i >= nums.length || j >= nums.length) {
            return false;
        }
        return nums[i] + nums[j] == target;
    }
}
