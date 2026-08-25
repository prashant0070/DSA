package dsa.practice.advanced;

import java.util.Arrays;
import java.util.List;

/**
 * LEARN
 * Topic: Graphs / matrix
 * Pattern: DFS from ocean borders; cells reachable from both oceans
 * Target: O(m × n) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.PacificAtlanticWaterFlow}
 */
public final class PacificAtlanticWaterFlow {

    public static List<List<Integer>> pacificAtlantic(int[][] heights) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        int[][] heights = {
            {1, 2, 2, 3, 5},
            {3, 2, 3, 4, 4},
            {2, 4, 5, 3, 1},
            {6, 7, 1, 4, 5},
            {5, 1, 1, 2, 4}
        };
        List<List<Integer>> result = pacificAtlantic(heights);
        failed += Checks.check("count", result.size() == 7);
        failed += Checks.check("contains 0,4", result.contains(Arrays.asList(0, 4)));
        failed += Checks.check("contains 2,2", result.contains(Arrays.asList(2, 2)));
        Checks.printResult(failed);
    }
}
