package dsa.practice.advanced;

import java.util.Arrays;
import java.util.List;

/**
 * LEARN
 * Topic: Backtracking
 * Pattern: Include / exclude each element at index i
 * Target: O(n × 2^n) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.Subsets}
 */
public final class Subsets {

    public static List<List<Integer>> subsets(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        List<List<Integer>> result = subsets(new int[] {1, 2, 3});
        failed += Checks.check("count", result.size() == 8);
        failed += Checks.check("contains empty", result.contains(List.of()));
        failed += Checks.check("contains full", result.contains(Arrays.asList(1, 2, 3)));
        Checks.printResult(failed);
    }
}
