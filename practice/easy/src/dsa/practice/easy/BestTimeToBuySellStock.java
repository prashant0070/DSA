package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: running minimum.
 * You may buy once and sell once, sell after buy. Walk left to right:
 * track the lowest price so far, and the best {@code price - lowest} seen.
 * One pass. Do not nest two loops (that is O(n²)).
 *
 * If no profit is possible, return 0.
 *
 * Run: {@code java -cp out dsa.practice.easy.BestTimeToBuySellStock}
 */
public final class BestTimeToBuySellStock {

    public static int maxProfit(int[] prices) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("profit", maxProfit(new int[] {7, 1, 5, 3, 6, 4}) == 5);
        failed += Checks.check("decreasing", maxProfit(new int[] {7, 6, 4, 3, 1}) == 0);
        failed += Checks.check("late peak", maxProfit(new int[] {2, 4, 1, 7}) == 6);
        Checks.printResult(failed);
    }
}
