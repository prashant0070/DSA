package dsa.practice.easy;

/**
 * LEARN
 * Topic: Sliding window + hashing
 * Logic: same value within distance {@code k}.
 * Walk i. Keep a set of the last k values (or a map of value → last index).
 * If nums[i] is already in the window, return true. Drop the value that just left the window.
 *
 * Run: {@code java -cp out dsa.practice.easy.ContainsNearbyDuplicate}
 */
public final class ContainsNearbyDuplicate {

    public static boolean containsNearbyDuplicate(int[] nums, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("yes", containsNearbyDuplicate(new int[] {1, 2, 3, 1}, 3));
        failed += Checks.check("too far", !containsNearbyDuplicate(new int[] {1, 2, 3, 1, 2, 3}, 2));
        failed += Checks.check("adjacent", containsNearbyDuplicate(new int[] {1, 0, 1, 1}, 1));
        Checks.printResult(failed);
    }
}
