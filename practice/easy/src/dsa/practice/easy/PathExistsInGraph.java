package dsa.practice.easy;

/**
 * LEARN
 * Topic: Graphs
 * Logic: path exists — BFS/DFS from source on an undirected graph, or Union-Find.
 * Build adjacency lists from {@code edges}. Visit neighbors until dest is reached.
 *
 * Run: {@code java -cp out dsa.practice.easy.PathExistsInGraph}
 */
public final class PathExistsInGraph {

    public static boolean validPath(int n, int[][] edges, int source, int dest) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("connected", validPath(3, new int[][] {{0, 1}, {1, 2}}, 0, 2));
        failed += Checks.check("disconnected", !validPath(6, new int[][] {{0, 1}, {0, 2}, {3, 5}, {5, 4}, {4, 3}}, 0, 5));
        failed += Checks.check("same node", validPath(1, new int[][] {}, 0, 0));
        Checks.printResult(failed);
    }
}
