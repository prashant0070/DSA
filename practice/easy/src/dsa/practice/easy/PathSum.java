package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees
 * Logic: root-to-leaf path sum.
 * Subtract node.val from target as you go. At a leaf, remaining == 0 means success.
 * Recurse left OR right (any path).
 *
 * Run: {@code java -cp out dsa.practice.easy.PathSum}
 */
public final class PathSum {

    public static boolean hasPathSum(TreeNode root, int targetSum) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        TreeNode tree = TreeNode.from(5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1);
        failed += Checks.check("22", hasPathSum(tree, 22));
        failed += Checks.check("missing", !hasPathSum(TreeNode.from(1, 2, 3), 5));
        failed += Checks.check("empty", !hasPathSum(null, 0));
        Checks.printResult(failed);
    }
}
