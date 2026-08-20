package dsa.linear;

/**
 * LEARN: circular array queue — head/tail indices wrap; O(1) offer/poll without shifting.
 */
public final class ArrayQueue<T> implements Queue<T> {

    private Object[] backing;
    private int head;
    private int size;

    public ArrayQueue() {
        this.backing = new Object[4];
        this.head = 0;
        this.size = 0;
    }

    @Override
    public void offer(T value) {
        if (size == backing.length) {
            resize();
        }
        int tail = (head + size) % backing.length;
        backing[tail] = value;
        size++;
    }

    @Override
    @SuppressWarnings("unchecked")
    public T poll() {
        if (isEmpty()) {
            throw new IllegalStateException("empty queue");
        }
        T value = (T) backing[head];
        backing[head] = null;
        head = (head + 1) % backing.length;
        size--;
        return value;
    }

    @Override
    @SuppressWarnings("unchecked")
    public T peek() {
        if (isEmpty()) {
            throw new IllegalStateException("empty queue");
        }
        return (T) backing[head];
    }

    @Override
    public boolean isEmpty() {
        return size == 0;
    }

    @Override
    public int size() {
        return size;
    }

    private void resize() {
        Object[] next = new Object[backing.length * 2];
        for (int i = 0; i < size; i++) {
            next[i] = backing[(head + i) % backing.length];
        }
        backing = next;
        head = 0;
    }
}
