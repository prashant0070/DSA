package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: intersection of two lists — two pointers switching heads.
 * Walk a then onto b; walk b then onto a. They meet at the shared node (or both null).
 * Lengths differ; the switch equalizes the remaining distance.
 *
 * Run: {@code java -cp out dsa.practice.easy.IntersectionOfTwoLists}
 */
public final class IntersectionOfTwoLists {

    public static Node getIntersectionNode(Node a, Node b) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        Node shared = Node.from(8, 4, 5);
        Node a = join(Node.from(4, 1), shared);
        Node b = join(Node.from(5, 6, 1), shared);
        failed += Checks.check("shared 8", getIntersectionNode(a, b) == shared);
        failed += Checks.check("none", getIntersectionNode(Node.from(2, 6, 4), Node.from(1, 5)) == null);
        Checks.printResult(failed);
    }

    private static Node join(Node prefix, Node tail) {
        if (prefix == null) {
            return tail;
        }
        Node last = prefix;
        while (last.next != null) {
            last = last.next;
        }
        last.next = tail;
        return prefix;
    }
}
