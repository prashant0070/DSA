package dsa.linear;

/** Contract for FIFO queue. */
public interface Queue<T> {

    void offer(T value);

    T poll();

    T peek();

    boolean isEmpty();

    int size();
}
