package dsa.practice.easy;

/**
 * LEARN
 * Topic: Heaps
 * Logic: last stone weight. Repeatedly smash the two heaviest.
 * If they differ, put |a-b| back. Use a max-heap (PriorityQueue reverse order).
 * Return the last stone, or 0 if none remain.
 *
 * Run: {@code java -cp out dsa.practice.easy.LastStoneWeight}
 */
public final class LastStoneWeight {

    public static int lastStoneWeight(int[] stones) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", lastStoneWeight(new int[] {2, 7, 4, 1, 8, 1}) == 1);
        failed += Checks.check("one", lastStoneWeight(new int[] {1}) == 1);
        failed += Checks.check("equal pair", lastStoneWeight(new int[] {4, 4}) == 0);
        Checks.printResult(failed);
    }
}
