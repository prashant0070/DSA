package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: three pointers — {@code prev}, {@code curr}, {@code next}.
 * While {@code curr} is not null: save {@code curr.next}, point {@code curr.next} at {@code prev},
 * then slide {@code prev = curr}, {@code curr = next}. Return {@code prev} (new head).
 *
 * Run: {@code java -cp out dsa.practice.easy.ReverseLinkedList}
 */
public final class ReverseLinkedList {

    public static Node reverse(Node head) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("three", Checks.same(Node.toArray(reverse(Node.from(1, 2, 3))), new int[] {3, 2, 1}));
        failed += Checks.check("one", Checks.same(Node.toArray(reverse(Node.from(1))), new int[] {1}));
        failed += Checks.check("empty", reverse(null) == null);
        Checks.printResult(failed);
    }
}
