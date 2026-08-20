package dsa.practice.easy;

/**
 * LEARN
 * Topic: Stack
 * Logic: next greater element (monotonic decreasing stack) on nums2.
 * Walk nums2. Pop while the top is smaller than the current value — that current value
 * is their next greater. Store answers in a map, then fill nums1 from the map. Missing → -1.
 *
 * Run: {@code java -cp out dsa.practice.easy.NextGreaterElement}
 */
public final class NextGreaterElement {

    public static int[] nextGreaterElement(int[] nums1, int[] nums2) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a", Checks.same(nextGreaterElement(new int[] {4, 1, 2}, new int[] {1, 3, 4, 2}), new int[] {-1, 3, -1}));
        failed += Checks.check("b", Checks.same(nextGreaterElement(new int[] {2, 4}, new int[] {1, 2, 3, 4}), new int[] {3, -1}));
        Checks.printResult(failed);
    }
}
