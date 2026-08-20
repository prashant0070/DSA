package dsa.practice.medium;

import java.util.Arrays;

/**
 * LEARN
 * Topic: Arrays / hashing
 * Pattern: Frequency map + min-heap (or bucket sort)
 * Target complexity: O(n log k) time, O(n) space
 *
 * Run: {@code java -cp out dsa.practice.medium.TopKFrequent}
 */
public final class TopKFrequent {

    public static int[] topKFrequent(int[] nums, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    private static int[] sorted(int[] nums) {
        int[] copy = Arrays.copyOf(nums, nums.length);
        Arrays.sort(copy);
        return copy;
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", Checks.same(
                sorted(topKFrequent(new int[] {1, 1, 1, 2, 2, 3}, 2)),
                new int[] {1, 2}));
        failed += Checks.check("k equals unique", Checks.same(
                sorted(topKFrequent(new int[] {1, 2}, 2)),
                new int[] {1, 2}));
        failed += Checks.check("single", Checks.same(
                topKFrequent(new int[] {4}, 1),
                new int[] {4}));
        Checks.printResult(failed);
    }
}
