package dsa.practice.easy;

/**
 * LEARN
 * Topic: Math
 * Logic: happy number — replace n by the sum of squares of its digits.
 * Repeat. 1 is happy. A cycle that is not 1 (often 4) is not. Use a HashSet of seen n,
 * or Floyd slow/fast on the sequence.
 *
 * Run: {@code java -cp out dsa.practice.easy.HappyNumber}
 */
public final class HappyNumber {

    public static boolean isHappy(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("19", isHappy(19));
        failed += Checks.check("2", !isHappy(2));
        failed += Checks.check("1", isHappy(1));
        Checks.printResult(failed);
    }
}
