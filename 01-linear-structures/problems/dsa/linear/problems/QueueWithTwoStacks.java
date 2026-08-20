package dsa.linear.problems;

import dsa.linear.Queue;
import dsa.linear.Stack;

/**
 * Problem 3 — queue using two stacks (classic design).
 *
 * Implement {@link QueueWithTwoStacks}:
 * offer → push on inStack
 * poll → if outStack empty, pour inStack into outStack, then pop outStack
 * Amortized O(1) per operation.
 *
 * Run: java -cp out dsa.linear.problems.QueueWithTwoStacks
 */
public final class QueueWithTwoStacks implements Queue<Integer> {

    private final Stack<Integer> inStack;
    private final Stack<Integer> outStack;

    public QueueWithTwoStacks(Stack<Integer> inStack, Stack<Integer> outStack) {
        this.inStack = inStack;
        this.outStack = outStack;
    }

    @Override
    public void offer(Integer value) {
        throw new UnsupportedOperationException("implement me");
    }

    @Override
    public Integer poll() {
        throw new UnsupportedOperationException("implement me");
    }

    @Override
    public Integer peek() {
        throw new UnsupportedOperationException("implement me");
    }

    @Override
    public boolean isEmpty() {
        throw new UnsupportedOperationException("implement me");
    }

    @Override
    public int size() {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        QueueWithTwoStacks q = new QueueWithTwoStacks(
                new dsa.linear.ArrayStack<>(),
                new dsa.linear.ArrayStack<>());
        q.offer(1);
        q.offer(2);
        failed += check("peek", q.peek() == 1);
        failed += check("poll", q.poll() == 1);
        failed += check("poll2", q.poll() == 2);
        failed += check("empty", q.isEmpty());
        print(failed);
    }

    private static int check(String name, boolean ok) {
        if (!ok) {
            System.out.println("FAIL: " + name);
            return 1;
        }
        return 0;
    }

    private static void print(int failed) {
        if (failed == 0) {
            System.out.println("All checks passed.");
        } else {
            System.out.println(failed + " check(s) failed.");
            System.exit(1);
        }
    }
}
