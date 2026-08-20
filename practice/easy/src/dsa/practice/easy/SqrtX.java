package dsa.practice.easy;

/**
 * LEARN
 * Topic: Binary search
 * Logic: search on the answer. Find the largest integer {@code x} with {@code x * x <= n}.
 * Search {@code 0..n} (or {@code 1..n/2}). Watch overflow: compare {@code mid <= n / mid} instead of {@code mid * mid}.
 *
 * Run: {@code java -cp out dsa.practice.easy.SqrtX}
 */
public final class SqrtX {

    public static int mySqrt(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("8", mySqrt(8) == 2);
        failed += Checks.check("4", mySqrt(4) == 2);
        failed += Checks.check("0", mySqrt(0) == 0);
        failed += Checks.check("1", mySqrt(1) == 1);
        Checks.printResult(failed);
    }
}
