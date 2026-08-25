package dsa.practice.advanced;

import java.util.ArrayList;
import java.util.List;

public final class Node {
    public int val;
    public Node next;

    public Node(int val) {
        this.val = val;
    }

    public static Node from(int... values) {
        Node dummy = new Node(0);
        Node tail = dummy;
        for (int v : values) {
            tail.next = new Node(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    public static int[] toArray(Node head) {
        List<Integer> list = new ArrayList<>();
        for (Node c = head; c != null; c = c.next) {
            list.add(c.val);
        }
        return list.stream().mapToInt(Integer::intValue).toArray();
    }
}
