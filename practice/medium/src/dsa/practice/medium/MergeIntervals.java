package dsa.practice.medium;

/**
 * LEARN
 * Topic: Intervals
 * Pattern: Sort by start, merge overlapping
 * Target complexity: O(n log n) time, O(n) space
 *
 * Run: {@code java -cp out dsa.practice.medium.MergeIntervals}
 */
public final class MergeIntervals {

    public static int[][] merge(int[][] intervals) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("overlap", Checks.same(
                merge(new int[][] {{1, 3}, {2, 6}, {8, 10}, {15, 18}}),
                new int[][] {{1, 6}, {8, 10}, {15, 18}}));
        failed += Checks.check("nested", Checks.same(
                merge(new int[][] {{1, 4}, {4, 5}}),
                new int[][] {{1, 5}}));
        failed += Checks.check("single", Checks.same(
                merge(new int[][] {{1, 4}}),
                new int[][] {{1, 4}}));
        Checks.printResult(failed);
    }
}
