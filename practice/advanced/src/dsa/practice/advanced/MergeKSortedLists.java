package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Linked list + heap
 * Pattern: Min-heap of list heads; pop smallest, push its next
 * Target: O(N log k) where N = total nodes, k = lists
 *
 * Run: {@code java -cp out dsa.practice.advanced.MergeKSortedLists}
 */
public final class MergeKSortedLists {

    public static Node mergeKLists(Node[] lists) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        Node[] lists = {
            Node.from(1, 4, 5),
            Node.from(1, 3, 4),
            Node.from(2, 6)
        };
        failed += Checks.check("merged", Checks.same(Node.toArray(mergeKLists(lists)),
                new int[] {1, 1, 2, 3, 4, 4, 5, 6}));
        failed += Checks.check("empty", mergeKLists(new Node[] {}) == null);
        Checks.printResult(failed);
    }
}
