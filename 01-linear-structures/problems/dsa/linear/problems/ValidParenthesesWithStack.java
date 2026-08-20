package dsa.linear.problems;

/**
 * Problem 1 — use YOUR stack (dsa.linear.Stack), not java.util.Stack.
 *
 * Implement isValid using ArrayStack or LinkedStack.
 * Push open brackets; on close, pop and check pair.
 *
 * Run: java -cp out dsa.linear.problems.ValidParenthesesWithStack
 */
public final class ValidParenthesesWithStack {

    public static boolean isValid(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += check("()", isValid("()"));
        failed += check("()[]{}", isValid("()[]{}"));
        failed += check("(]", !isValid("(]"));
        failed += check("([)]", !isValid("([)]"));
        failed += check("{[]}", isValid("{[]}"));
        print(failed);
    }

    private static int check(String name, boolean ok) {
        if (!ok) {
            System.out.println("FAIL: " + name);
            return 1;
        }
        return 0;
    }

    private static void print(int failed) {
        if (failed == 0) {
            System.out.println("All checks passed.");
        } else {
            System.out.println(failed + " check(s) failed.");
            System.exit(1);
        }
    }
}
