package dsa.practice.easy;

/**
 * LEARN
 * Topic: Bit manipulation
 * Logic: XOR. a^a = 0, a^0 = a. XOR every number; duplicates cancel; the unique remains.
 * Every value appears twice except one.
 *
 * Run: {@code java -cp out dsa.practice.easy.SingleNumber}
 */
public final class SingleNumber {

    public static int singleNumber(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a", singleNumber(new int[] {2, 2, 1}) == 1);
        failed += Checks.check("b", singleNumber(new int[] {4, 1, 2, 1, 2}) == 4);
        failed += Checks.check("one", singleNumber(new int[] {1}) == 1);
        Checks.printResult(failed);
    }
}
