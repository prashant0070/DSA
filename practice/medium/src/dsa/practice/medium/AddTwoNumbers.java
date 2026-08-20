package dsa.practice.medium;

/**
 * LEARN
 * Topic: Linked list
 * Pattern: Digit-by-digit carry with dummy head
 * Target complexity: O(max(m, n)) time, O(1) extra space
 *
 * Run: {@code java -cp out dsa.practice.medium.AddTwoNumbers}
 */
public final class AddTwoNumbers {

    public static Node addTwoNumbers(Node l1, Node l2) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", Checks.same(
                Node.toArray(addTwoNumbers(Node.from(2, 4, 3), Node.from(5, 6, 4))),
                new int[] {7, 0, 8}));
        failed += Checks.check("carry tail", Checks.same(
                Node.toArray(addTwoNumbers(Node.from(9, 9, 9), Node.from(1))),
                new int[] {0, 0, 0, 1}));
        failed += Checks.check("zeros", Checks.same(
                Node.toArray(addTwoNumbers(Node.from(0), Node.from(0))),
                new int[] {0}));
        Checks.printResult(failed);
    }
}
