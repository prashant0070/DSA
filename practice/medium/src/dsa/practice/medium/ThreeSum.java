package dsa.practice.medium;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Sort + two pointers
 * Target complexity: O(n²) time, O(1) extra space (excluding output)
 *
 * Run: {@code java -cp out dsa.practice.medium.ThreeSum}
 */
public final class ThreeSum {

    public static List<List<Integer>> threeSum(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    private static List<List<Integer>> normalize(List<List<Integer>> triples) {
        List<List<Integer>> copy = new ArrayList<>();
        for (List<Integer> t : triples) {
            List<Integer> sorted = new ArrayList<>(t);
            sorted.sort(Integer::compareTo);
            copy.add(sorted);
        }
        copy.sort(Comparator.comparing(t -> t.get(0) * 10000 + t.get(1) * 100 + t.get(2)));
        return copy;
    }

    public static void main(String[] args) {
        int failed = 0;
        List<List<Integer>> expected = List.of(
                List.of(-1, -1, 2),
                List.of(-1, 0, 1));
        failed += Checks.check("classic", Checks.same(
                normalize(threeSum(new int[] {-1, 0, 1, 2, -1, -4})),
                normalize(expected)));
        failed += Checks.check("no triplet", threeSum(new int[] {0, 1, 1}).isEmpty());
        failed += Checks.check("zeros", Checks.same(
                normalize(threeSum(new int[] {0, 0, 0})),
                normalize(List.of(List.of(0, 0, 0)))));
        Checks.printResult(failed);
    }
}
