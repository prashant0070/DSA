package dsa.practice.easy;

/**
 * LEARN
 * Topic: Design / prefix sums
 * Logic: range sum query. Precompute prefix[i] = sum of nums[0..i).
 * sumRange(left, right) = prefix[right+1] - prefix[left]. O(1) after O(n) setup.
 *
 * Run: {@code java -cp out dsa.practice.easy.RangeSumQuery}
 */
public final class RangeSumQuery {

    public RangeSumQuery(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public int sumRange(int left, int right) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        RangeSumQuery numArray = new RangeSumQuery(new int[] {-2, 0, 3, -5, 2, -1});
        failed += Checks.check("0..2", numArray.sumRange(0, 2) == 1);
        failed += Checks.check("2..5", numArray.sumRange(2, 5) == -1);
        failed += Checks.check("0..5", numArray.sumRange(0, 5) == -3);
        Checks.printResult(failed);
    }
}
