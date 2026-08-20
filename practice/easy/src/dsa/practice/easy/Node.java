package dsa.practice.easy;

import java.util.ArrayList;
import java.util.List;

/**
 * Singly linked list node for the easy list problems.
 * Not a problem — use this as the node type.
 */
public final class Node {

    public int val;
    public Node next;

    public Node(int val) {
        this.val = val;
    }

    public static Node from(int... values) {
        Node dummy = new Node(0);
        Node tail = dummy;
        for (int value : values) {
            tail.next = new Node(value);
            tail = tail.next;
        }
        return dummy.next;
    }

    public static int[] toArray(Node head) {
        List<Integer> values = new ArrayList<>();
        for (Node current = head; current != null; current = current.next) {
            values.add(current.val);
        }
        int[] array = new int[values.size()];
        for (int i = 0; i < array.length; i++) {
            array[i] = values.get(i);
        }
        return array;
    }
}
