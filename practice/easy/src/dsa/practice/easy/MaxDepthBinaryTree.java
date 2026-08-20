package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees
 * Logic: DFS height. Depth of null is 0. Depth of a node is 1 + max(left, right).
 *
 * Run: {@code java -cp out dsa.practice.easy.MaxDepthBinaryTree}
 */
public final class MaxDepthBinaryTree {

    public static int maxDepth(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("balanced", maxDepth(TreeNode.from(3, 9, 20, null, null, 15, 7)) == 3);
        failed += Checks.check("skew", maxDepth(TreeNode.from(1, null, 2)) == 2);
        failed += Checks.check("empty", maxDepth(null) == 0);
        Checks.printResult(failed);
    }
}
