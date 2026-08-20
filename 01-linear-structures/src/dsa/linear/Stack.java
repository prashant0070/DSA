package dsa.linear;

/** Contract for LIFO stack — ArrayStack and LinkedStack both implement this. */
public interface Stack<T> {

    void push(T value);

    T pop();

    T peek();

    boolean isEmpty();

    int size();
}
