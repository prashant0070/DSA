package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Binary search on rotated sorted array
 * Target complexity: O(log n) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.SearchRotatedSortedArray}
 */
public final class SearchRotatedSortedArray {

    public static int search(int[] nums, int target) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("rotated", search(new int[] {4, 5, 6, 7, 0, 1, 2}, 0) == 4);
        failed += Checks.check("not found", search(new int[] {4, 5, 6, 7, 0, 1, 2}, 3) == -1);
        failed += Checks.check("single", search(new int[] {1}, 1) == 0);
        failed += Checks.check("no rotation", search(new int[] {1, 3, 5}, 3) == 1);
        Checks.printResult(failed);
    }
}
