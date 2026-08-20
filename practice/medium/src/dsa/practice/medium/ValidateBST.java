package dsa.practice.medium;

/**
 * LEARN
 * Topic: Binary tree
 * Pattern: DFS with min/max bounds
 * Target complexity: O(n) time, O(h) space
 *
 * Run: {@code java -cp out dsa.practice.medium.ValidateBST}
 */
public final class ValidateBST {

    public static boolean isValidBST(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("valid", isValidBST(TreeNode.from(2, 1, 3)));
        failed += Checks.check("invalid child", !isValidBST(TreeNode.from(5, 1, 4, null, null, 3, 6)));
        failed += Checks.check("single", isValidBST(TreeNode.from(1)));
        failed += Checks.check("empty", isValidBST(null));
        Checks.printResult(failed);
    }
}
