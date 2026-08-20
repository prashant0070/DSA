package dsa.practice.easy;

/**
 * LEARN
 * Topic: Binary search
 * Logic: lo/hi on a sorted array. Mid = lo + (hi-lo)/2. Go left or right by compare.
 * Return the index of {@code target}, or -1 if missing. Must be O(log n), not a linear scan.
 *
 * Run: {@code java -cp out dsa.practice.easy.BinarySearch}
 */
public final class BinarySearch {

    public static int search(int[] nums, int target) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("found", search(new int[] {-1, 0, 3, 5, 9, 12}, 9) == 4);
        failed += Checks.check("missing", search(new int[] {-1, 0, 3, 5, 9, 12}, 2) == -1);
        failed += Checks.check("one", search(new int[] {5}, 5) == 0);
        Checks.printResult(failed);
    }
}
