package dsa.practice.easy;

/**
 * LEARN
 * Topic: Math
 * Logic: missing value in {@code 0..n}.
 * {@code nums} has length {@code n} and contains each number in {@code 0..n} except one.
 * Sum of {@code 0..n} is {@code n * (n + 1) / 2}. Missing = that sum minus the array sum.
 * XOR of {@code 0..n} with every array value also leaves the missing number.
 *
 * Run: {@code java -cp out dsa.practice.easy.MissingNumber}
 */
public final class MissingNumber {

    public static int missingNumber(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("missing 2", missingNumber(new int[] {3, 0, 1}) == 2);
        failed += Checks.check("missing 0", missingNumber(new int[] {1, 2}) == 0);
        failed += Checks.check("missing last", missingNumber(new int[] {0, 1}) == 2);
        Checks.printResult(failed);
    }
}
