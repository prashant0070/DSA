package dsa.practice.medium;

/**
 * LEARN
 * Topic: Grid / graph
 * Pattern: DFS or BFS on '1'/'0' grid
 * Target complexity: O(rows × cols) time, O(rows × cols) space
 *
 * Run: {@code java -cp out dsa.practice.medium.NumberOfIslands}
 */
public final class NumberOfIslands {

    public static int numIslands(char[][] grid) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("one island", numIslands(new char[][] {
                {'1', '1', '1', '1', '0'},
                {'1', '1', '0', '1', '0'},
                {'1', '1', '0', '0', '0'},
                {'0', '0', '0', '0', '0'}
        }) == 1);
        failed += Checks.check("three islands", numIslands(new char[][] {
                {'1', '1', '0', '0', '0'},
                {'1', '1', '0', '0', '0'},
                {'0', '0', '1', '0', '0'},
                {'0', '0', '0', '1', '1'}
        }) == 3);
        failed += Checks.check("empty", numIslands(new char[][] {{'0', '0'}, {'0', '0'}}) == 0);
        Checks.printResult(failed);
    }
}
