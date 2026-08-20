package dsa.practice.easy;

/**
 * LEARN
 * Topic: Stack / design
 * Logic: queue using two stacks.
 * In-stack for push. To pop/peek, pour into out-stack if out is empty (reverses order).
 * Amortized O(1).
 *
 * Run: {@code java -cp out dsa.practice.easy.QueueUsingStacks}
 */
public final class QueueUsingStacks {

    public QueueUsingStacks() {
        throw new UnsupportedOperationException("implement me");
    }

    public void push(int x) {
        throw new UnsupportedOperationException("implement me");
    }

    public int pop() {
        throw new UnsupportedOperationException("implement me");
    }

    public int peek() {
        throw new UnsupportedOperationException("implement me");
    }

    public boolean empty() {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        QueueUsingStacks q = new QueueUsingStacks();
        q.push(1);
        q.push(2);
        failed += Checks.check("peek 1", q.peek() == 1);
        failed += Checks.check("pop 1", q.pop() == 1);
        failed += Checks.check("not empty", !q.empty());
        failed += Checks.check("pop 2", q.pop() == 2);
        failed += Checks.check("empty", q.empty());
        Checks.printResult(failed);
    }
}
