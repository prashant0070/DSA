package dsa.practice.easy;

/**
 * LEARN
 * Topic: Dynamic programming
 * Logic: climbing stairs — ways(n) = ways(n-1) + ways(n-2). Fibonacci.
 * Bottom-up with two variables, or memoized recursion. n ≥ 1.
 *
 * Run: {@code java -cp out dsa.practice.easy.ClimbingStairs}
 */
public final class ClimbingStairs {

    public static int climbStairs(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("2", climbStairs(2) == 2);
        failed += Checks.check("3", climbStairs(3) == 3);
        failed += Checks.check("4", climbStairs(4) == 5);
        Checks.printResult(failed);
    }
}
