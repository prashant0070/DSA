package dsa.practice.easy;

/**
 * LEARN
 * Topic: Two pointers
 * Logic: sorted array, two sums.
 * Left at 0, right at end. If sum too small, left++. If too big, right--. If equal, return those indices.
 * O(n) after sort is already given. Indices are 0-based. Exactly one answer.
 *
 * Run: {@code java -cp out dsa.practice.easy.TwoSumSorted}
 */
public final class TwoSumSorted {

    public static int[] twoSum(int[] numbers, int target) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("basic", Checks.same(twoSum(new int[] {2, 7, 11, 15}, 9), new int[] {0, 1}));
        failed += Checks.check("later", Checks.same(twoSum(new int[] {2, 3, 4}, 6), new int[] {0, 2}));
        failed += Checks.check("neg", Checks.same(twoSum(new int[] {-1, 0}, -1), new int[] {0, 1}));
        Checks.printResult(failed);
    }
}
