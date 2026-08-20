package dsa.practice.easy;

/**
 * LEARN
 * Topic: Binary search
 * Logic: binary search on a predicate (first true).
 * Versions {@code 1..n}. All versions {@code >= firstBad} are bad. Call {@link #isBadVersion}
 * to test. Find the smallest bad version with as few calls as possible (log n).
 *
 * Run: {@code java -cp out dsa.practice.easy.FirstBadVersion}
 */
public final class FirstBadVersion {

    private static int firstBad;

    static boolean isBadVersion(int version) {
        return version >= firstBad;
    }

    public static int firstBadVersion(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("n=5 bad=4", run(5, 4) == 4);
        failed += Checks.check("n=1 bad=1", run(1, 1) == 1);
        failed += Checks.check("first is bad", run(8, 1) == 1);
        Checks.printResult(failed);
    }

    private static int run(int n, int bad) {
        firstBad = bad;
        return firstBadVersion(n);
    }
}
