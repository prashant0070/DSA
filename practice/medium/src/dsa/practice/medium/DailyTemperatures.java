package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Monotonic stack (next warmer day)
 * Target complexity: O(n) time, O(n) space
 *
 * Run: {@code java -cp out dsa.practice.medium.DailyTemperatures}
 */
public final class DailyTemperatures {

    public static int[] dailyTemperatures(int[] temperatures) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", Checks.same(
                dailyTemperatures(new int[] {73, 74, 75, 71, 69, 72, 76, 73}),
                new int[] {1, 1, 4, 2, 1, 1, 0, 0}));
        failed += Checks.check("decreasing", Checks.same(
                dailyTemperatures(new int[] {30, 20, 10}),
                new int[] {0, 0, 0}));
        failed += Checks.check("single", Checks.same(
                dailyTemperatures(new int[] {55}),
                new int[] {0}));
        Checks.printResult(failed);
    }
}
