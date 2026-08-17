package dsa.foundations;

/**
 * LEARN: generics — {@code T} is a placeholder for a type the caller chooses.
 *
 * {@code Box<String>} can only hold a String. {@code Box<Integer>} only Integer.
 * The compiler checks this, so you do not cast and do not get ClassCastException.
 *
 * Without generics you would store {@code Object} and write
 * {@code String s = (String) box.get()} — easy to get wrong.
 *
 * Later: {@code DynamicArray<T>}, {@code Stack<T>}, {@code HashMap<K,V>}
 * are the same idea. {@code T} means "one type"; {@code K} and {@code V}
 * mean key and value.
 *
 * {@code Box<>} (empty {@code <>}) lets the compiler infer T from the left side:
 * {@code Box<String> names = new Box<>();}
 */
public final class Box<T> {

    private T value; // whatever T is for this instance

    public Box() {
        this.value = null;
    }

    public Box(T value) {
        this.value = value;
    }

    public T get() {
        return value;
    }

    public void set(T value) {
        this.value = value;
    }

    public boolean isEmpty() {
        return value == null;
    }
}
