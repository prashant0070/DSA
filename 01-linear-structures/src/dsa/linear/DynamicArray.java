package dsa.linear;

/**
 * LEARN: dynamic array — contiguous storage, double capacity when full.
 * Invariant: elements in indices [0, size); size <= backing.length.
 */
public final class DynamicArray<T> implements Iterable<T> {

    private Object[] backing;
    private int size;

    public DynamicArray() {
        this.backing = new Object[4];
        this.size = 0;
    }

    public int size() {
        return size;
    }

    @SuppressWarnings("unchecked")
    public T get(int index) {
        requireIndex(index);
        return (T) backing[index];
    }

    public void set(int index, T value) {
        requireIndex(index);
        backing[index] = value;
    }

    public void add(T value) {
        ensureCapacity(size + 1);
        backing[size++] = value;
    }

    public T removeLast() {
        if (size == 0) {
            throw new IllegalStateException("empty array");
        }
        @SuppressWarnings("unchecked")
        T removed = (T) backing[--size];
        backing[size] = null;
        return removed;
    }

    private void ensureCapacity(int minCapacity) {
        if (minCapacity <= backing.length) {
            return;
        }
        int newCapacity = backing.length * 2;
        Object[] next = new Object[newCapacity];
        System.arraycopy(backing, 0, next, 0, size);
        backing = next;
    }

    private void requireIndex(int index) {
        if (index < 0 || index >= size) {
            throw new IndexOutOfBoundsException(index);
        }
    }

    @Override
    public java.util.Iterator<T> iterator() {
        return new java.util.Iterator<>() {
            private int i = 0;

            @Override
            public boolean hasNext() {
                return i < size;
            }

            @Override
            @SuppressWarnings("unchecked")
            public T next() {
                if (!hasNext()) {
                    throw new java.util.NoSuchElementException();
                }
                return (T) backing[i++];
            }
        };
    }
}
