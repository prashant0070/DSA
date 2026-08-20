package dsa.practice.easy;

/**
 * LEARN
 * Topic: Math
 * Logic: Sieve of Eratosthenes. Count primes strictly less than n.
 * Mark multiples of each prime starting at p*p. n can be 0 or 1 → 0 primes.
 *
 * Run: {@code java -cp out dsa.practice.easy.CountPrimes}
 */
public final class CountPrimes {

    public static int countPrimes(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("10", countPrimes(10) == 4);
        failed += Checks.check("0", countPrimes(0) == 0);
        failed += Checks.check("1", countPrimes(1) == 0);
        failed += Checks.check("2", countPrimes(2) == 0);
        failed += Checks.check("3", countPrimes(3) == 1);
        Checks.printResult(failed);
    }
}
