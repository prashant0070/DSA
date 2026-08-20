package dsa.practice.easy;

/**
 * LEARN
 * Topic: Greedy
 * Logic: lemonade change. Bills are 5, 10, or 20. Drink costs 5.
 * Track counts of 5s and 10s. Prefer giving a 10+5 for a 20 (keep 5s). Return false if you cannot change.
 *
 * Run: {@code java -cp out dsa.practice.easy.LemonadeChange}
 */
public final class LemonadeChange {

    public static boolean lemonadeChange(int[] bills) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("ok", lemonadeChange(new int[] {5, 5, 5, 10, 20}));
        failed += Checks.check("fail", !lemonadeChange(new int[] {5, 5, 10, 10, 20}));
        failed += Checks.check("first 10", !lemonadeChange(new int[] {10, 10}));
        Checks.printResult(failed);
    }
}
