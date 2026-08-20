package dsa.practice.medium;

import java.util.Arrays;

/**
 * LEARN
 * Topic: Arrays / heap
 * Pattern: Sort or max-heap by distance to origin
 * Target complexity: O(n log k) time, O(k) space
 *
 * Run: {@code java -cp out dsa.practice.medium.KClosestPointsToOrigin}
 */
public final class KClosestPointsToOrigin {

    public static int[][] kClosest(int[][] points, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    private static int[][] sortedByDist(int[][] points) {
        int[][] copy = Arrays.stream(points)
                .map(row -> Arrays.copyOf(row, row.length))
                .toArray(int[][]::new);
        Arrays.sort(copy, (a, b) -> {
            int da = a[0] * a[0] + a[1] * a[1];
            int db = b[0] * b[0] + b[1] * b[1];
            if (da != db) {
                return Integer.compare(da, db);
            }
            if (a[0] != b[0]) {
                return Integer.compare(a[0], b[0]);
            }
            return Integer.compare(a[1], b[1]);
        });
        return copy;
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("k=1", Checks.same(
                kClosest(new int[][] {{1, 3}, {-2, 2}}, 1),
                new int[][] {{-2, 2}}));
        failed += Checks.check("k=2", Checks.same(
                sortedByDist(kClosest(new int[][] {{3, 3}, {5, -1}, {-2, 4}}, 2)),
                sortedByDist(new int[][] {{3, 3}, {-2, 4}})));
        failed += Checks.check("single point", Checks.same(
                kClosest(new int[][] {{0, 1}}, 1),
                new int[][] {{0, 1}}));
        Checks.printResult(failed);
    }
}
