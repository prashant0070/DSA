package dsa.practice.medium;

/**
 * LEARN
 * Topic: Trie
 * Pattern: Prefix tree with insert / search / startsWith
 * Target complexity: O(word length) per operation
 *
 * Run: {@code java -cp out dsa.practice.medium.ImplementTrie}
 */
public final class ImplementTrie {

    public static final class Trie {

        public void insert(String word) {
            throw new UnsupportedOperationException("implement me");
        }

        public boolean search(String word) {
            throw new UnsupportedOperationException("implement me");
        }

        public boolean startsWith(String prefix) {
            throw new UnsupportedOperationException("implement me");
        }
    }

    public static void main(String[] args) {
        int failed = 0;
        Trie trie = new Trie();
        trie.insert("apple");
        failed += Checks.check("search hit", trie.search("apple"));
        failed += Checks.check("search miss", !trie.search("app"));
        failed += Checks.check("prefix", trie.startsWith("app"));
        trie.insert("app");
        failed += Checks.check("after insert", trie.search("app"));
        Checks.printResult(failed);
    }
}
