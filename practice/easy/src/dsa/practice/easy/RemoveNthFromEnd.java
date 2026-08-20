package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: remove nth from end — two pointers with a gap of n.
 * Advance first n steps, then move first and second together. When first hits the end,
 * second is before the node to delete. Dummy head helps when deleting the real head.
 *
 * Run: {@code java -cp out dsa.practice.easy.RemoveNthFromEnd}
 */
public final class RemoveNthFromEnd {

    public static Node removeNthFromEnd(Node head, int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("n=2", Checks.same(Node.toArray(removeNthFromEnd(Node.from(1, 2, 3, 4, 5), 2)), new int[] {1, 2, 3, 5}));
        failed += Checks.check("remove head", Checks.same(Node.toArray(removeNthFromEnd(Node.from(1, 2), 2)), new int[] {2}));
        failed += Checks.check("remove tail", Checks.same(Node.toArray(removeNthFromEnd(Node.from(1, 2), 1)), new int[] {1}));
        Checks.printResult(failed);
    }
}
