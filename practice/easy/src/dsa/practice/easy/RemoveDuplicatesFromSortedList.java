package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: skip duplicates on a sorted list.
 * If curr.val == curr.next.val, set curr.next = curr.next.next. Else walk curr forward.
 *
 * Run: {@code java -cp out dsa.practice.easy.RemoveDuplicatesFromSortedList}
 */
public final class RemoveDuplicatesFromSortedList {

    public static Node deleteDuplicates(Node head) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("dups", Checks.same(Node.toArray(deleteDuplicates(Node.from(1, 1, 2))), new int[] {1, 2}));
        failed += Checks.check("more", Checks.same(Node.toArray(deleteDuplicates(Node.from(1, 1, 2, 3, 3))), new int[] {1, 2, 3}));
        failed += Checks.check("none", Checks.same(Node.toArray(deleteDuplicates(Node.from(1, 2, 3))), new int[] {1, 2, 3}));
        Checks.printResult(failed);
    }
}
