package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: merge two sorted lists — dummy head + tail pointer.
 * Always attach the smaller of the two heads. When one list ends, attach the rest.
 *
 * Run: {@code java -cp out dsa.practice.easy.MergeTwoSortedLists}
 */
public final class MergeTwoSortedLists {

    public static Node merge(Node a, Node b) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("mix", Checks.same(Node.toArray(merge(Node.from(1, 2, 4), Node.from(1, 3, 4))), new int[] {1, 1, 2, 3, 4, 4}));
        failed += Checks.check("empty b", Checks.same(Node.toArray(merge(Node.from(1, 2), null)), new int[] {1, 2}));
        failed += Checks.check("both empty", merge(null, null) == null);
        Checks.printResult(failed);
    }
}
