package dsa.practice.easy;

/**
 * LEARN
 * Topic: Stack / design
 * Logic: MinStack — O(1) push, pop, top, getMin.
 * Store the current min next to each value (a second stack, or a pair).
 * When you pop, the previous min is waiting underneath.
 *
 * Run: {@code java -cp out dsa.practice.easy.MinStack}
 */
public final class MinStack {

    public MinStack() {
        throw new UnsupportedOperationException("implement me");
    }

    public void push(int val) {
        throw new UnsupportedOperationException("implement me");
    }

    public void pop() {
        throw new UnsupportedOperationException("implement me");
    }

    public int top() {
        throw new UnsupportedOperationException("implement me");
    }

    public int getMin() {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        MinStack stack = new MinStack();
        stack.push(-2);
        stack.push(0);
        stack.push(-3);
        failed += Checks.check("min -3", stack.getMin() == -3);
        stack.pop();
        failed += Checks.check("top 0", stack.top() == 0);
        failed += Checks.check("min -2", stack.getMin() == -2);
        Checks.printResult(failed);
    }
}
