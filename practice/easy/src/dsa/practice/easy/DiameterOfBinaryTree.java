package dsa.practice.easy;

/**
 * LEARN
 * Topic: Trees
 * Logic: diameter = longest path (number of edges) between any two nodes.
 * For each node, height(left) + height(right) is a candidate. Track a global max.
 * Height is the usual 1 + max(left, right).
 *
 * Run: {@code java -cp out dsa.practice.easy.DiameterOfBinaryTree}
 */
public final class DiameterOfBinaryTree {

    public static int diameter(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", diameter(TreeNode.from(1, 2, 3, 4, 5)) == 3);
        failed += Checks.check("one edge", diameter(TreeNode.from(1, 2)) == 1);
        failed += Checks.check("empty", diameter(null) == 0);
        Checks.printResult(failed);
    }
}
