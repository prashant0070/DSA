package dsa.practice.easy;

import java.util.List;

/**
 * LEARN
 * Topic: Intervals
 * Logic: summary ranges on a sorted unique array.
 * Walk a streak of consecutive numbers. Emit {@code "a"} or {@code "a->b"}.
 *
 * Run: {@code java -cp out dsa.practice.easy.SummaryRanges}
 */
public final class SummaryRanges {

    public static List<String> summaryRanges(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("a", Checks.same(summaryRanges(new int[] {0, 1, 2, 4, 5, 7}), List.of("0->2", "4->5", "7")));
        failed += Checks.check("b", Checks.same(summaryRanges(new int[] {0, 2, 3, 4, 6, 8, 9}), List.of("0", "2->4", "6", "8->9")));
        failed += Checks.check("empty", Checks.same(summaryRanges(new int[] {}), List.of()));
        Checks.printResult(failed);
    }
}
