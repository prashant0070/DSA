package dsa.practice.medium;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

public final class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;

    public TreeNode(int val) {
        this.val = val;
    }

    public static TreeNode from(Integer... level) {
        if (level.length == 0 || level[0] == null) {
            return null;
        }
        TreeNode root = new TreeNode(level[0]);
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < level.length) {
            TreeNode cur = q.remove();
            if (i < level.length && level[i] != null) {
                cur.left = new TreeNode(level[i]);
                q.add(cur.left);
            }
            i++;
            if (i < level.length && level[i] != null) {
                cur.right = new TreeNode(level[i]);
                q.add(cur.right);
            }
            i++;
        }
        return root;
    }
}
