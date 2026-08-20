package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: cycle detect — Floyd (slow/fast).
 * Slow +1, fast +2. If they meet, there is a cycle. If fast hits null, there is not.
 * Do not put nodes in a HashSet unless you must; interviews want the two-pointer version.
 *
 * Run: {@code java -cp out dsa.practice.easy.LinkedListCycle}
 */
public final class LinkedListCycle {

    public static boolean hasCycle(Node head) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("cycle", hasCycle(cycled(Node.from(3, 2, 0, -4), 1)));
        failed += Checks.check("two-node cycle", hasCycle(cycled(Node.from(1, 2), 0)));
        failed += Checks.check("none", !hasCycle(Node.from(1, 2, 3)));
        failed += Checks.check("empty", !hasCycle(null));
        Checks.printResult(failed);
    }

    private static Node cycled(Node head, int pos) {
        Node join = head;
        for (int i = 0; i < pos; i++) {
            join = join.next;
        }
        Node tail = head;
        while (tail.next != null) {
            tail = tail.next;
        }
        tail.next = join;
        return head;
    }
}
