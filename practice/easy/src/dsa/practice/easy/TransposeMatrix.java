package dsa.practice.easy;

/**
 * LEARN
 * Topic: Matrix
 * Logic: transpose — result[j][i] = matrix[i][j]. New matrix of size cols × rows.
 *
 * Run: {@code java -cp out dsa.practice.easy.TransposeMatrix}
 */
public final class TransposeMatrix {

    public static int[][] transpose(int[][] matrix) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("2x3", Checks.same(
                transpose(new int[][] {{1, 2, 3}, {4, 5, 6}}),
                new int[][] {{1, 4}, {2, 5}, {3, 6}}));
        failed += Checks.check("square", Checks.same(
                transpose(new int[][] {{1, 2}, {3, 4}}),
                new int[][] {{1, 3}, {2, 4}}));
        Checks.printResult(failed);
    }
}
