package dsa.practice.easy;

/**
 * LEARN
 * Topic: Bit manipulation
 * Logic: power of two. n &gt; 0 and {@code (n & (n-1)) == 0} (exactly one bit set).
 *
 * Run: {@code java -cp out dsa.practice.easy.PowerOfTwo}
 */
public final class PowerOfTwo {

    public static boolean isPowerOfTwo(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("1", isPowerOfTwo(1));
        failed += Checks.check("16", isPowerOfTwo(16));
        failed += Checks.check("3", !isPowerOfTwo(3));
        failed += Checks.check("0", !isPowerOfTwo(0));
        failed += Checks.check("neg", !isPowerOfTwo(-2));
        Checks.printResult(failed);
    }
}
