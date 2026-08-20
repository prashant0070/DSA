package dsa.linear;

/** LEARN: queue with head + tail pointers — offer at tail, poll from head. */
public final class LinkedQueue<T> implements Queue<T> {

    private static final class Node<T> {
        T value;
        Node<T> next;

        Node(T value) {
            this.value = value;
        }
    }

    private Node<T> head;
    private Node<T> tail;
    private int size;

    @Override
    public void offer(T value) {
        Node<T> node = new Node<>(value);
        if (tail == null) {
            head = tail = node;
        } else {
            tail.next = node;
            tail = node;
        }
        size++;
    }

    @Override
    public T poll() {
        if (head == null) {
            throw new IllegalStateException("empty queue");
        }
        T value = head.value;
        head = head.next;
        if (head == null) {
            tail = null;
        }
        size--;
        return value;
    }

    @Override
    public T peek() {
        if (head == null) {
            throw new IllegalStateException("empty queue");
        }
        return head.value;
    }

    @Override
    public boolean isEmpty() {
        return size == 0;
    }

    @Override
    public int size() {
        return size;
    }
}
