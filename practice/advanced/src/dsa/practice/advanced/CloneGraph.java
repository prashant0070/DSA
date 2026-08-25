package dsa.practice.advanced;

import java.util.ArrayList;
import java.util.List;

/**
 * LEARN
 * Topic: Graphs
 * Pattern: BFS/DFS + HashMap oldNode → cloneNode
 * Target: O(V + E) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.CloneGraph}
 */
public final class CloneGraph {

    public static GraphNode cloneGraph(GraphNode node) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        GraphNode n1 = new GraphNode(1);
        GraphNode n2 = new GraphNode(2);
        GraphNode n3 = new GraphNode(3);
        GraphNode n4 = new GraphNode(4);
        n1.neighbors = List.of(n2, n4);
        n2.neighbors = List.of(n1, n3);
        n3.neighbors = List.of(n2, n4);
        n4.neighbors = List.of(n1, n3);

        GraphNode copy = cloneGraph(n1);
        failed += Checks.check("not same object", copy != n1);
        failed += Checks.check("same val", copy.val == 1);
        failed += Checks.check("two neighbors", copy.neighbors.size() == 2);
        failed += Checks.check("neighbor not original",
                copy.neighbors.get(0) != n2 && copy.neighbors.get(0).val == 2);
        failed += Checks.check("null", cloneGraph(null) == null);
        Checks.printResult(failed);
    }
}
