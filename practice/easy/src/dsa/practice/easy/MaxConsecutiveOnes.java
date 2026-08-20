package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: running streak.
 * Walk the array. If you see {@code 1}, streak++. If you see {@code 0}, streak = 0.
 * Keep {@code max(max, streak)} after each step.
 *
 * {@code nums} contains only 0 and 1.
 *
 * Run: {@code java -cp out dsa.practice.easy.MaxConsecutiveOnes}
 */
public final class MaxConsecutiveOnes {

    public static int findMaxConsecutiveOnes(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("middle", findMaxConsecutiveOnes(new int[] {1, 1, 0, 1, 1, 1}) == 3);
        failed += Checks.check("none", findMaxConsecutiveOnes(new int[] {0, 0}) == 0);
        failed += Checks.check("all ones", findMaxConsecutiveOnes(new int[] {1, 1, 1}) == 3);
        Checks.printResult(failed);
    }
}
