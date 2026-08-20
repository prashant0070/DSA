package dsa.practice.easy;

/**
 * LEARN
 * Topic: Graphs / matrix DFS
 * Logic: flood fill. 4-direction DFS or BFS from (sr, sc). Recolor every cell that matches
 * the start color. Do not walk diagonally. If new color equals old, return as-is.
 *
 * Run: {@code java -cp out dsa.practice.easy.FloodFill}
 */
public final class FloodFill {

    public static int[][] floodFill(int[][] image, int sr, int sc, int color) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        int[][] a = {{1, 1, 1}, {1, 1, 0}, {1, 0, 1}};
        int[][] filled = floodFill(a, 1, 1, 2);
        failed += Checks.check("fill", Checks.same(filled, new int[][] {{2, 2, 2}, {2, 2, 0}, {2, 0, 1}}));
        int[][] b = {{0, 0, 0}, {0, 0, 0}};
        failed += Checks.check("same color", Checks.same(floodFill(b, 0, 0, 0), new int[][] {{0, 0, 0}, {0, 0, 0}}));
        Checks.printResult(failed);
    }
}
