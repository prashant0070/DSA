package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Trees
 * Pattern: Post-order max gain; global max of (leftGain + rightGain + node.val)
 * Target: O(n) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.BinaryTreeMaximumPathSum}
 */
public final class BinaryTreeMaximumPathSum {

    public static int maxPathSum(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        TreeNode t1 = TreeNode.from(1, 2, 3);
        failed += Checks.check("simple", maxPathSum(t1) == 6);
        TreeNode t2 = TreeNode.from(-10, 9, 20, null, null, 15, 7);
        failed += Checks.check("negative root", maxPathSum(t2) == 42);
        Checks.printResult(failed);
    }
}
