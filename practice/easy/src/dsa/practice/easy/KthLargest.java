package dsa.practice.easy;

/**
 * LEARN
 * Topic: Heaps / design
 * Logic: kth largest in a stream. Keep a min-heap of size k (the k largest, smallest on top).
 * {@link #add} inserts, then if size &gt; k poll. Top of the heap is the kth largest.
 *
 * Run: {@code java -cp out dsa.practice.easy.KthLargest}
 */
public final class KthLargest {

    public KthLargest(int k, int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public int add(int val) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        KthLargest stream = new KthLargest(3, new int[] {4, 5, 8, 2});
        failed += Checks.check("add 3", stream.add(3) == 4);
        failed += Checks.check("add 5", stream.add(5) == 5);
        failed += Checks.check("add 10", stream.add(10) == 5);
        failed += Checks.check("add 9", stream.add(9) == 8);
        failed += Checks.check("add 4", stream.add(4) == 8);
        Checks.printResult(failed);
    }
}
