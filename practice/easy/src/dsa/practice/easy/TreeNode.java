package dsa.practice.easy;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

/**
 * Binary tree node for the easy tree problems.
 * Not a problem — use this as the node type.
 */
public final class TreeNode {

    public int val;
    public TreeNode left;
    public TreeNode right;

    public TreeNode(int val) {
        this.val = val;
    }

    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }

    /** Level-order build. {@code null} entries are missing children. */
    public static TreeNode from(Integer... level) {
        if (level.length == 0 || level[0] == null) {
            return null;
        }
        TreeNode root = new TreeNode(level[0]);
        Queue<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < level.length) {
            TreeNode current = queue.remove();
            if (i < level.length) {
                Integer leftVal = level[i++];
                if (leftVal != null) {
                    current.left = new TreeNode(leftVal);
                    queue.add(current.left);
                }
            }
            if (i < level.length) {
                Integer rightVal = level[i++];
                if (rightVal != null) {
                    current.right = new TreeNode(rightVal);
                    queue.add(current.right);
                }
            }
        }
        return root;
    }

    public static boolean same(TreeNode a, TreeNode b) {
        if (a == null || b == null) {
            return a == b;
        }
        return a.val == b.val && same(a.left, b.left) && same(a.right, b.right);
    }

    public static List<Integer> inorder(TreeNode root) {
        List<Integer> values = new ArrayList<>();
        walk(root, values);
        return values;
    }

    private static void walk(TreeNode node, List<Integer> values) {
        if (node == null) {
            return;
        }
        walk(node.left, values);
        values.add(node.val);
        walk(node.right, values);
    }
}
