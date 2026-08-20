package dsa.practice.medium;

import java.util.List;

/**
 * LEARN
 * Topic: Binary tree
 * Pattern: Level-order BFS
 * Target complexity: O(n) time, O(n) space
 *
 * Run: {@code java -cp out dsa.practice.medium.BinaryTreeLevelOrder}
 */
public final class BinaryTreeLevelOrder {

    public static List<List<Integer>> levelOrder(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", Checks.same(
                levelOrder(TreeNode.from(3, 9, 20, null, null, 15, 7)),
                List.of(List.of(3), List.of(9, 20), List.of(15, 7))));
        failed += Checks.check("single", Checks.same(
                levelOrder(TreeNode.from(1)),
                List.of(List.of(1))));
        failed += Checks.check("empty", levelOrder(null).isEmpty());
        Checks.printResult(failed);
    }
}
