package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees
 * Logic: same tree — both null, or same val and same left and same right.
 *
 * Run: {@code java -cp out dsa.practice.easy.SameTree}
 */
public final class SameTree {

    public static boolean isSameTree(TreeNode p, TreeNode q) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("same", isSameTree(TreeNode.from(1, 2, 3), TreeNode.from(1, 2, 3)));
        failed += Checks.check("diff", !isSameTree(TreeNode.from(1, 2), TreeNode.from(1, null, 2)));
        failed += Checks.check("both empty", isSameTree(null, null));
        Checks.printResult(failed);
    }
}
