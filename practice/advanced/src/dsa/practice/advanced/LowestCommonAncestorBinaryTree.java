package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Trees
 * Pattern: Post-order — if both subtrees return non-null, current node is LCA
 * Target: O(n) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.LowestCommonAncestorBinaryTree}
 */
public final class LowestCommonAncestorBinaryTree {

    public static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        TreeNode root = TreeNode.from(3, 5, 1, 6, 2, 0, 8, null, null, 7, 4);
        TreeNode p = root.left;
        TreeNode q = root.right;
        TreeNode lca = lowestCommonAncestor(root, p, q);
        failed += Checks.check("root is lca", lca != null && lca.val == 3);

        TreeNode p2 = root.left;
        TreeNode q2 = root.left.right.right;
        TreeNode lca2 = lowestCommonAncestor(root, p2, q2);
        failed += Checks.check("5 is lca", lca2 != null && lca2.val == 5);
        Checks.printResult(failed);
    }
}
