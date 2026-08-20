package dsa.linear.problems;

import dsa.linear.SinglyLinkedList;

/**
 * Problem 2 — reverse a singly linked list in place.
 *
 * Implement {@link SinglyLinkedList#reverseInPlace()} in
 * {@code src/dsa/linear/SinglyLinkedList.java} using prev/curr/next pointers.
 * Do not allocate a new list.
 *
 * Run: java -cp out dsa.linear.problems.ReverseLinkedListInPlace
 */
public final class ReverseLinkedListInPlace {

    public static void main(String[] args) {
        int failed = 0;
        failed += check("three", listEquals(build(1, 2, 3), new int[] {3, 2, 1}));
        failed += check("one", listEquals(build(7), new int[] {7}));
        failed += check("empty", listEquals(new SinglyLinkedList<Integer>(), new int[] {}));
        print(failed);
    }

    private static SinglyLinkedList<Integer> build(int... values) {
        SinglyLinkedList<Integer> list = new SinglyLinkedList<>();
        for (int i = values.length - 1; i >= 0; i--) {
            list.addFirst(values[i]);
        }
        list.reverseInPlace();
        return list;
    }

    private static boolean listEquals(SinglyLinkedList<Integer> list, int[] expected) {
        int i = 0;
        for (int v : list) {
            if (i >= expected.length || v != expected[i]) {
                return false;
            }
            i++;
        }
        return i == expected.length;
    }

    private static int check(String name, boolean ok) {
        if (!ok) {
            System.out.println("FAIL: " + name);
            return 1;
        }
        return 0;
    }

    private static void print(int failed) {
        if (failed == 0) {
            System.out.println("All checks passed.");
        } else {
            System.out.println(failed + " check(s) failed.");
            System.exit(1);
        }
    }
}
