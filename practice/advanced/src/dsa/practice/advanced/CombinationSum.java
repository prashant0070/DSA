package dsa.practice.advanced;

import java.util.Arrays;
import java.util.List;

/**
 * LEARN
 * Topic: Backtracking
 * Pattern: Choose candidates from start index; same number reusable if allowed
 * Target: exponential — prune when sum exceeds target
 *
 * Run: {@code java -cp out dsa.practice.advanced.CombinationSum}
 */
public final class CombinationSum {

    public static List<List<Integer>> combinationSum(int[] candidates, int target) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        List<List<Integer>> result = combinationSum(new int[] {2, 3, 6, 7}, 7);
        failed += Checks.check("count", result.size() == 2);
        failed += Checks.check("2+2+3", result.contains(Arrays.asList(2, 2, 3)));
        failed += Checks.check("7", result.contains(Arrays.asList(7)));
        Checks.printResult(failed);
    }
}
