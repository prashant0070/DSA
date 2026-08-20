package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: slow / fast pointers.
 * Fast walks two nodes at a time, slow walks one. When fast hits the end, slow is at the middle.
 * If the list has even length, return the second middle node.
 *
 * Run: {@code java -cp out dsa.practice.easy.MiddleOfLinkedList}
 */
public final class MiddleOfLinkedList {

    public static Node middle(Node head) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("odd", middle(Node.from(1, 2, 3, 4, 5)).val == 3);
        failed += Checks.check("even", middle(Node.from(1, 2, 3, 4, 5, 6)).val == 4);
        failed += Checks.check("one", middle(Node.from(1)).val == 1);
        Checks.printResult(failed);
    }
}
