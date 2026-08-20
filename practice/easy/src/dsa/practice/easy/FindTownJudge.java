package dsa.practice.easy;

/**
 * LEARN
 * Topic: Graphs
 * Logic: town judge — in-degree / out-degree.
 * Judge trusts nobody (out = 0) and is trusted by everyone else (in = n-1).
 * {@code trust[i] = [a, b]} means a trusts b. Return the judge label, or -1.
 *
 * Run: {@code java -cp out dsa.practice.easy.FindTownJudge}
 */
public final class FindTownJudge {

    public static int findJudge(int n, int[][] trust) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("n=2", findJudge(2, new int[][] {{1, 2}}) == 2);
        failed += Checks.check("n=3", findJudge(3, new int[][] {{1, 3}, {2, 3}}) == 3);
        failed += Checks.check("cycle", findJudge(3, new int[][] {{1, 3}, {2, 3}, {3, 1}}) == -1);
        Checks.printResult(failed);
    }
}
