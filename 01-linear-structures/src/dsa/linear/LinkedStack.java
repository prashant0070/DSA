package dsa.linear;

/** LEARN: stack backed by linked list — push/pop at head (addFirst/removeFirst). */
public final class LinkedStack<T> implements Stack<T> {

    private final SinglyLinkedList<T> list = new SinglyLinkedList<>();

    @Override
    public void push(T value) {
        list.addFirst(value);
    }

    @Override
    public T pop() {
        return list.removeFirst();
    }

    @Override
    public T peek() {
        if (isEmpty()) {
            throw new IllegalStateException("empty stack");
        }
        // peek without remove: iterator first element
        return list.iterator().next();
    }

    @Override
    public boolean isEmpty() {
        return list.size() == 0;
    }

    @Override
    public int size() {
        return list.size();
    }
}
