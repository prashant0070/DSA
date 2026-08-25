package dsa.practice.advanced;

import java.util.Arrays;
import java.util.List;

/**
 * LEARN
 * Topic: Backtracking
 * Pattern: Swap or used[] — build permutation position by position
 * Target: O(n × n!) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.Permutations}
 */
public final class Permutations {

    public static List<List<Integer>> permute(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        List<List<Integer>> result = permute(new int[] {1, 2, 3});
        failed += Checks.check("count", result.size() == 6);
        failed += Checks.check("contains 123", result.contains(Arrays.asList(1, 2, 3)));
        failed += Checks.check("contains 321", result.contains(Arrays.asList(3, 2, 1)));
        Checks.printResult(failed);
    }
}
