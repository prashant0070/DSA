package dsa.practice.easy;

/**
 * LEARN
 * Topic: Binary search
 * Logic: same lo/hi loop, but when missing return the insertion index (where it would go).
 * That is {@code lo} after the loop.
 *
 * Run: {@code java -cp out dsa.practice.easy.SearchInsertPosition}
 */
public final class SearchInsertPosition {

    public static int searchInsert(int[] nums, int target) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("found", searchInsert(new int[] {1, 3, 5, 6}, 5) == 2);
        failed += Checks.check("insert 2", searchInsert(new int[] {1, 3, 5, 6}, 2) == 1);
        failed += Checks.check("insert end", searchInsert(new int[] {1, 3, 5, 6}, 7) == 4);
        failed += Checks.check("insert front", searchInsert(new int[] {1, 3, 5, 6}, 0) == 0);
        Checks.printResult(failed);
    }
}
