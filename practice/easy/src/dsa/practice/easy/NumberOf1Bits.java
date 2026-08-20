package dsa.practice.easy;

/**
 * LEARN
 * Topic: Bit manipulation
 * Logic: count 1-bits. {@code n = n & (n-1)} drops the lowest set bit. Loop until n is 0.
 * Treat {@code n} as unsigned (in Java use the bits of the int as-is, including negatives).
 *
 * Run: {@code java -cp out dsa.practice.easy.NumberOf1Bits}
 */
public final class NumberOf1Bits {

    public static int hammingWeight(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("11", hammingWeight(11) == 3);
        failed += Checks.check("128", hammingWeight(128) == 1);
        failed += Checks.check("minus one", hammingWeight(-1) == 32);
        Checks.printResult(failed);
    }
}
