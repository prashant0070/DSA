package dsa.linear;

/**
 * LEARN: singly linked list — O(1) add/remove at front; Node is private inner class.
 */
public final class SinglyLinkedList<T> implements Iterable<T> {

    private Node<T> head;
    private int size;

    private static final class Node<T> {
        T value;
        Node<T> next;

        Node(T value) {
            this.value = value;
        }
    }

    public int size() {
        return size;
    }

    public void addFirst(T value) {
        Node<T> node = new Node<>(value);
        node.next = head;
        head = node;
        size++;
    }

    public T removeFirst() {
        if (head == null) {
            throw new IllegalStateException("empty list");
        }
        T value = head.value;
        head = head.next;
        size--;
        return value;
    }

    public boolean contains(T value) {
        for (T item : this) {
            if (java.util.Objects.equals(item, value)) {
                return true;
            }
        }
        return false;
    }

    /** Phase 1 problem 2 — implement this method (three pointers). */
    public void reverseInPlace() {
        throw new UnsupportedOperationException("implement me — see ReverseLinkedListInPlace problem");
    }

    /** Copy values to array for tests (head → tail). */
    @SuppressWarnings("unchecked")
    public T[] toArray(T[] sample) {
        java.util.List<T> values = new java.util.ArrayList<>();
        for (T v : this) {
            values.add(v);
        }
        return values.toArray(sample);
    }

    @Override
    public java.util.Iterator<T> iterator() {
        return new java.util.Iterator<>() {
            private Node<T> current = head;

            @Override
            public boolean hasNext() {
                return current != null;
            }

            @Override
            public T next() {
                if (!hasNext()) {
                    throw new java.util.NoSuchElementException();
                }
                T value = current.value;
                current = current.next;
                return value;
            }
        };
    }
}
