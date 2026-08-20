package dsa.practice.easy;

/**
 * LEARN
 * Topic: Greedy
 * Logic: assign cookies. Sort greeds and sizes. Give the smallest cookie that satisfies
 * the next child. Two pointers after sort.
 *
 * Run: {@code java -cp out dsa.practice.easy.AssignCookies}
 */
public final class AssignCookies {

    public static int findContentChildren(int[] g, int[] s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a", findContentChildren(new int[] {1, 2, 3}, new int[] {1, 1}) == 1);
        failed += Checks.check("b", findContentChildren(new int[] {1, 2}, new int[] {1, 2, 3}) == 2);
        failed += Checks.check("none", findContentChildren(new int[] {10}, new int[] {1, 2}) == 0);
        Checks.printResult(failed);
    }
}
