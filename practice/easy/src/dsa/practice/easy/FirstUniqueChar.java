package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings + hashing
 * Logic: count, then scan.
 * First pass: count how many times each character appears.
 * Second pass: return the index of the first character whose count is 1.
 * If none, return -1. Lowercase English letters. Index is 0-based.
 *
 * Run: {@code java -cp out dsa.practice.easy.FirstUniqueChar}
 */
public final class FirstUniqueChar {

    public static int firstUniqChar(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("leetcode", firstUniqChar("leetcode") == 0);
        failed += Checks.check("loveleetcode", firstUniqChar("loveleetcode") == 2);
        failed += Checks.check("aabb", firstUniqChar("aabb") == -1);
        Checks.printResult(failed);
    }
}
