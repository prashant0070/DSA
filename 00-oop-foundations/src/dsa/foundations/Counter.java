package dsa.foundations;

/**
 * LEARN: the smallest data structure — one number plus operations.
 *
 * Invariant after every public method: {@code 0 <= value <= max}.
 *
 * Later phases use the same idea at a larger scale:
 * a stack's size never goes negative, a heap's parent is never smaller than a child.
 */
public final class Counter {

    private final int max; // ceiling, chosen once in the constructor
    private int value;     // current count, starts at 0

    public Counter(int max) {
        if (max < 0) {
            throw new IllegalArgumentException("max must be >= 0");
        }
        this.max = max;
        this.value = 0;
    }

    public int value() {
        return value;
    }

    public int max() {
        return max;
    }

    public void increment() {
        if (value >= max) {
            throw new IllegalStateException("counter is at max");
        }
        value++;
    }

    public void reset() {
        value = 0; // still inside [0, max], so the invariant holds
    }
}
