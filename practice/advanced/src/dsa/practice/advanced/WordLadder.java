package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Graphs
 * Pattern: BFS from beginWord; try changing each char; use Set for wordList
 * Target: O(n × wordLen × alphabet) BFS
 *
 * Run: {@code java -cp out dsa.practice.advanced.WordLadder}
 */
public final class WordLadder {

    public static int ladderLength(String beginWord, String endWord, java.util.List<String> wordList) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("example", ladderLength("hit", "cog",
                java.util.List.of("hot", "dot", "dog", "lot", "log", "cog")) == 5);
        failed += Checks.check("no path", ladderLength("hit", "cog",
                java.util.List.of("hot", "dot", "dog", "lot", "log")) == 0);
        Checks.printResult(failed);
    }
}
