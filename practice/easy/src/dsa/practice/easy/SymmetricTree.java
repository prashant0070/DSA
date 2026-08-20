package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees
 * Logic: symmetric — left and right mirrors.
 * Helper {@code mirror(a, b)}: both null, or a.val == b.val and mirror(a.left, b.right)
 * and mirror(a.right, b.left).
 *
 * Run: {@code java -cp out dsa.practice.easy.SymmetricTree}
 */
public final class SymmetricTree {

    public static boolean isSymmetric(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("yes", isSymmetric(TreeNode.from(1, 2, 2, 3, 4, 4, 3)));
        failed += Checks.check("no", !isSymmetric(TreeNode.from(1, 2, 2, null, 3, null, 3)));
        failed += Checks.check("empty", isSymmetric(null));
        Checks.printResult(failed);
    }
}
