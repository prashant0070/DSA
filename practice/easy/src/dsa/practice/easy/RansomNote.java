package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings + hashing
 * Logic: frequency of magazine letters must cover ransomNote.
 * Count magazine, then decrement while walking ransomNote. A count going negative → false.
 *
 * Run: {@code java -cp out dsa.practice.easy.RansomNote}
 */
public final class RansomNote {

    public static boolean canConstruct(String ransomNote, String magazine) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a from b", !canConstruct("a", "b"));
        failed += Checks.check("aa from ab", !canConstruct("aa", "ab"));
        failed += Checks.check("aa from aab", canConstruct("aa", "aab"));
        Checks.printResult(failed);
    }
}
