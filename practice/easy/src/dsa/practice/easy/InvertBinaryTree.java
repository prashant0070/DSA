package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees
 * Logic: invert — swap left and right at every node (DFS or BFS).
 * Recurse on children after (or before) the swap.
 *
 * Run: {@code java -cp out dsa.practice.easy.InvertBinaryTree}
 */
public final class InvertBinaryTree {

    public static TreeNode invert(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        TreeNode inverted = invert(TreeNode.from(4, 2, 7, 1, 3, 6, 9));
        failed += Checks.check("mirror", TreeNode.same(inverted, TreeNode.from(4, 7, 2, 9, 6, 3, 1)));
        failed += Checks.check("empty", invert(null) == null);
        Checks.printResult(failed);
    }
}
