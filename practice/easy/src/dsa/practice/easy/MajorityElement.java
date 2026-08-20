package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: majority vote (Boyer–Moore) or a HashMap count.
 * One value appears more than {@code n / 2} times. Find it in linear time.
 * Boyer–Moore: keep a candidate and a count; count++ if same, else count-- and pick a new candidate at 0.
 *
 * Run: {@code java -cp out dsa.practice.easy.MajorityElement}
 */
public final class MajorityElement {

    public static int majorityElement(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("simple", majorityElement(new int[] {3, 2, 3}) == 3);
        failed += Checks.check("longer", majorityElement(new int[] {2, 2, 1, 1, 1, 2, 2}) == 2);
        failed += Checks.check("all", majorityElement(new int[] {1, 1, 1}) == 1);
        Checks.printResult(failed);
    }
}
