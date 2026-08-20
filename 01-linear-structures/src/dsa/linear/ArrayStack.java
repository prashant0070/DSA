package dsa.linear;

/** LEARN: stack backed by DynamicArray — push/pop at end. */
public final class ArrayStack<T> implements Stack<T> {

    private final DynamicArray<T> data = new DynamicArray<>();

    @Override
    public void push(T value) {
        data.add(value);
    }

    @Override
    public T pop() {
        return data.removeLast();
    }

    @Override
    public T peek() {
        if (isEmpty()) {
            throw new IllegalStateException("empty stack");
        }
        return data.get(data.size() - 1);
    }

    @Override
    public boolean isEmpty() {
        return data.size() == 0;
    }

    @Override
    public int size() {
        return data.size();
    }
}
