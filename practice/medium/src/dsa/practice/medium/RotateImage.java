package dsa.practice.medium;

/**
 * LEARN
 * Topic: Matrix
 * Pattern: Transpose + reverse rows (90° clockwise in place)
 * Target complexity: O(n²) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.RotateImage}
 */
public final class RotateImage {

    public static void rotate(int[][] matrix) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        int[][] a = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
        rotate(a);
        failed += Checks.check("3x3", Checks.same(a, new int[][] {{7, 4, 1}, {8, 5, 2}, {9, 6, 3}}));
        int[][] b = {{1, 2}, {3, 4}};
        rotate(b);
        failed += Checks.check("2x2", Checks.same(b, new int[][] {{3, 1}, {4, 2}}));
        int[][] c = {{1}};
        rotate(c);
        failed += Checks.check("1x1", Checks.same(c, new int[][] {{1}}));
        Checks.printResult(failed);
    }
}
