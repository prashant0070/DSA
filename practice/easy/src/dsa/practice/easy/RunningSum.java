package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: prefix sum — {@code out[i] = nums[0] + nums[1] + ... + nums[i]}.
 * Keep a running total so you do not re-sum from the start each time (O(n), not O(n²)).
 *
 * Return a new array. Do not modify {@code nums}.
 *
 * Run: {@code java -cp out dsa.practice.easy.RunningSum}
 */
public final class RunningSum {

    public static int[] runningSum(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("basic", Checks.same(runningSum(new int[] {1, 2, 3, 4}), new int[] {1, 3, 6, 10}));
        failed += Checks.check("single", Checks.same(runningSum(new int[] {5}), new int[] {5}));
        failed += Checks.check("with zero", Checks.same(runningSum(new int[] {1, 0, 1}), new int[] {1, 1, 2}));
        Checks.printResult(failed);
    }
}
