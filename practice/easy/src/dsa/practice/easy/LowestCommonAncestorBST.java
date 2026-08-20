package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees / BST
 * Logic: LCA in a BST using the ordered property.
 * If both p and q are smaller than root, go left. Both larger → right. Otherwise root is the split (LCA).
 * p and q exist in the tree.
 *
 * Run: {@code java -cp out dsa.practice.easy.LowestCommonAncestorBST}
 */
public final class LowestCommonAncestorBST {

    public static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        TreeNode root = TreeNode.from(6, 2, 8, 0, 4, 7, 9, null, null, 3, 5);
        failed += Checks.check("split", lowestCommonAncestor(root, find(root, 2), find(root, 8)).val == 6);
        failed += Checks.check("under 2", lowestCommonAncestor(root, find(root, 2), find(root, 4)).val == 2);
        Checks.printResult(failed);
    }

    private static TreeNode find(TreeNode node, int val) {
        if (node == null || node.val == val) {
            return node;
        }
        TreeNode left = find(node.left, val);
        return left != null ? left : find(node.right, val);
    }
}
