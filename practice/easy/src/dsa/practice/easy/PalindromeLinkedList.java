package dsa.practice.easy;

/**
 * LEARN
 * Topic: Linked list
 * Logic: palindrome — reverse the second half, then compare.
 * Find the middle (slow/fast), reverse from mid, compare first half with reversed second.
 * Extra array is allowed for easy, but try the reverse-half approach.
 *
 * Run: {@code java -cp out dsa.practice.easy.PalindromeLinkedList}
 */
public final class PalindromeLinkedList {

    public static boolean isPalindrome(Node head) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("odd yes", isPalindrome(Node.from(1, 2, 1)));
        failed += Checks.check("even yes", isPalindrome(Node.from(1, 2, 2, 1)));
        failed += Checks.check("no", !isPalindrome(Node.from(1, 2)));
        failed += Checks.check("one", isPalindrome(Node.from(1)));
        Checks.printResult(failed);
    }
}
