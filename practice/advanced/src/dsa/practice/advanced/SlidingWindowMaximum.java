package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Sliding window
 * Pattern: Monotonic deque of indices (decreasing values)
 * Target: O(n) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.SlidingWindowMaximum}
 */
public final class SlidingWindowMaximum {

    public static int[] maxSlidingWindow(int[] nums, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("example",
                Checks.same(maxSlidingWindow(new int[] {1, 3, -1, -3, 5, 3, 6, 7}, 3),
                        new int[] {3, 3, 5, 5, 6, 7}));
        failed += Checks.check("single", Checks.same(maxSlidingWindow(new int[] {1}, 1), new int[] {1}));
        Checks.printResult(failed);
    }
}
