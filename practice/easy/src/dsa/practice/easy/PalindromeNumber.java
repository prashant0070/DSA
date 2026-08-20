package dsa.practice.easy;

/**
 * LEARN
 * Topic: Math
 * Logic: palindrome number without converting to a string (preferred).
 * Reverse the second half of the digits, or reverse all and compare.
 * Watch overflow if you reverse the whole int; reversing half avoids it. Negatives are not palindromes.
 *
 * Run: {@code java -cp out dsa.practice.easy.PalindromeNumber}
 */
public final class PalindromeNumber {

    public static boolean isPalindrome(int x) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("121", isPalindrome(121));
        failed += Checks.check("neg", !isPalindrome(-121));
        failed += Checks.check("10", !isPalindrome(10));
        failed += Checks.check("0", isPalindrome(0));
        Checks.printResult(failed);
    }
}
