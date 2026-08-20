package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings + hashing
 * Logic: frequency count.
 * Two strings are anagrams if they use the same characters the same number of times
 * (order does not matter). Count letters of {@code a}, subtract letters of {@code b}.
 * If a count would go negative, or lengths differ, they are not anagrams.
 * Lowercase English letters only.
 *
 * Run: {@code java -cp out dsa.practice.easy.ValidAnagram}
 */
public final class ValidAnagram {

    public static boolean isAnagram(String a, String b) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("yes", isAnagram("anagram", "nagaram"));
        failed += Checks.check("no", !isAnagram("rat", "car"));
        failed += Checks.check("length", !isAnagram("ab", "a"));
        Checks.printResult(failed);
    }
}
