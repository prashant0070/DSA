package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Design + trees
 * Pattern: BFS/DFS with null markers, or preorder with "#"
 * Serialize and deserialize must be inverses.
 *
 * Run: {@code java -cp out dsa.practice.advanced.SerializeDeserializeBinaryTree}
 */
public final class SerializeDeserializeBinaryTree {

    public String serialize(TreeNode root) {
        throw new UnsupportedOperationException("implement me");
    }

    public TreeNode deserialize(String data) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        SerializeDeserializeBinaryTree codec = new SerializeDeserializeBinaryTree();
        TreeNode root = TreeNode.from(1, 2, 3, null, null, 4, 5);
        String data = codec.serialize(root);
        TreeNode back = codec.deserialize(data);
        failed += Checks.check("roundtrip root", back != null && back.val == 1);
        failed += Checks.check("left", back.left != null && back.left.val == 2);
        failed += Checks.check("right", back.right != null && back.right.val == 3);
        failed += Checks.check("null root", codec.deserialize(codec.serialize(null)) == null);
        Checks.printResult(failed);
    }
}
