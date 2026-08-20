package dsa.practice.easy;

/**
 * LEARN
 * Topic: Stack
 * Logic: matching pairs.
 * Walk the string. Push opening brackets {@code ( [ \{} onto a stack (ArrayDeque).
 * On a closer, the stack must be non-empty and the top must be the matching opener; then pop.
 * At the end the stack must be empty (every opener closed). Extra closer or wrong type → false.
 *
 * Run: {@code java -cp out dsa.practice.easy.ValidParentheses}
 */
public final class ValidParentheses {

    public static boolean isValid(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("simple", isValid("()"));
        failed += Checks.check("mixed", isValid("()[]{}"));
        failed += Checks.check("wrong pair", !isValid("(]"));
        failed += Checks.check("nested", isValid("{[]}"));
        failed += Checks.check("extra close", !isValid("([)]"));
        Checks.printResult(failed);
    }
}
