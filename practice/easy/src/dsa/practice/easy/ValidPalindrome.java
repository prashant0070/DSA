package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings
 * Logic: two pointers + filter.
 * Left and right move toward the center. Skip characters that are not letters or digits.
 * Compare the remaining pair ignoring case. If any pair mismatches, it is not a palindrome.
 *
 * Empty / punctuation-only strings count as palindromes.
 *
 * Run: {@code java -cp out dsa.practice.easy.ValidPalindrome}
 */
public final class ValidPalindrome {

    public static boolean isPalindrome(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("phrase", isPalindrome("A man, a plan, a canal: Panama"));
        failed += Checks.check("not", !isPalindrome("race a car"));
        failed += Checks.check("spaces", isPalindrome(" "));
        Checks.printResult(failed);
    }
}
