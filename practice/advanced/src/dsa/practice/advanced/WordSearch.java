package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Backtracking
 * Pattern: DFS on grid; mark visited; unmark on backtrack
 * Target: O(m × n × 4^L) where L = word length
 *
 * Run: {@code java -cp out dsa.practice.advanced.WordSearch}
 */
public final class WordSearch {

    public static boolean exist(char[][] board, String word) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        char[][] board = {
            {'A', 'B', 'C', 'E'},
            {'S', 'F', 'C', 'S'},
            {'A', 'D', 'E', 'E'}
        };
        failed += Checks.check("ABCCED", exist(board, "ABCCED"));
        failed += Checks.check("SEE", exist(board, "SEE"));
        failed += Checks.check("ABCB", !exist(board, "ABCB"));
        Checks.printResult(failed);
    }
}
