package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings
 * Logic: sliding a window of length {@code needle} (or two nested loops).
 * Return the first index of {@code needle} in {@code haystack}, or -1.
 * Empty needle → 0. Do not call {@code String.indexOf}; write the scan yourself.
 *
 * Run: {@code java -cp out dsa.practice.easy.IndexOfSubstring}
 */
public final class IndexOfSubstring {

    public static int strStr(String haystack, String needle) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("found", strStr("sadbutsad", "sad") == 0);
        failed += Checks.check("later", strStr("leetcode", "leeto") == -1);
        failed += Checks.check("empty needle", strStr("abc", "") == 0);
        failed += Checks.check("middle", strStr("hello", "ll") == 2);
        Checks.printResult(failed);
    }
}
