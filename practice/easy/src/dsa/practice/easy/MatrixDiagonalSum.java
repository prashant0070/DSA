package dsa.practice.easy;

/**
 * LEARN
 * Topic: Matrix
 * Logic: primary diagonal i==j plus secondary i+j==n-1. Do not double-count the center
 * when n is odd.
 *
 * Run: {@code java -cp out dsa.practice.easy.MatrixDiagonalSum}
 */
public final class MatrixDiagonalSum {

    public static int diagonalSum(int[][] mat) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("3x3", diagonalSum(new int[][] {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}) == 25);
        failed += Checks.check("2x2", diagonalSum(new int[][] {{1, 1}, {1, 1}}) == 4);
        Checks.printResult(failed);
    }
}
