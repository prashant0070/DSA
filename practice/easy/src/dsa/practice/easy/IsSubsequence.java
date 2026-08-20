package dsa.practice.easy;

/**
 * LEARN
 * Topic: Two pointers
 * Logic: subsequence — {@code s} is in {@code t} if you can delete some chars of t (keep order).
 * One pointer in s, one in t. Advance t always; advance s only on a match. s is a subsequence if
 * its pointer reaches the end.
 *
 * Run: {@code java -cp out dsa.practice.easy.IsSubsequence}
 */
public final class IsSubsequence {

    public static boolean isSubsequence(String s, String t) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("abc in ahbgdc", isSubsequence("abc", "ahbgdc"));
        failed += Checks.check("axc not", !isSubsequence("axc", "ahbgdc"));
        failed += Checks.check("empty s", isSubsequence("", "abc"));
        Checks.printResult(failed);
    }
}
