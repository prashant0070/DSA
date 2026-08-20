package dsa.practice.easy;

import java.util.ArrayList;
import java.util.List;

/**
 * LEARN
 * Topic: Trees / BST
 * Logic: sorted array → height-balanced BST. Mid of the range becomes the root.
 * Recurse on left slice and right slice. Inorder of the tree must equal the array,
 * and the tree must be balanced (|leftHeight - rightHeight| ≤ 1 everywhere).
 *
 * Run: {@code java -cp out dsa.practice.easy.SortedArrayToBST}
 */
public final class SortedArrayToBST {

    public static TreeNode sortedArrayToBST(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        int[] nums = {-10, -3, 0, 5, 9};
        TreeNode root = sortedArrayToBST(nums);
        failed += Checks.check("inorder", Checks.same(TreeNode.inorder(root), toList(nums)));
        failed += Checks.check("balanced", balanced(root));
        failed += Checks.check("empty", sortedArrayToBST(new int[] {}) == null);
        Checks.printResult(failed);
    }

    private static List<Integer> toList(int[] nums) {
        List<Integer> list = new ArrayList<>();
        for (int n : nums) {
            list.add(n);
        }
        return list;
    }

    private static boolean balanced(TreeNode node) {
        return height(node) != -1;
    }

    private static int height(TreeNode node) {
        if (node == null) {
            return 0;
        }
        int left = height(node.left);
        int right = height(node.right);
        if (left < 0 || right < 0 || Math.abs(left - right) > 1) {
            return -1;
        }
        return 1 + Math.max(left, right);
    }
}
