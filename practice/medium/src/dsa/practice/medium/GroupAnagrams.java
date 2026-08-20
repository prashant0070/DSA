package dsa.practice.medium;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * LEARN
 * Topic: Strings / hashing
 * Pattern: Hash map with sorted string key
 * Target complexity: O(n × k log k) time, O(n × k) space
 *
 * Run: {@code java -cp out dsa.practice.medium.GroupAnagrams}
 */
public final class GroupAnagrams {

    public static List<List<String>> groupAnagrams(String[] strs) {
        throw new UnsupportedOperationException("implement me");
    }

    private static List<List<String>> normalizeGroups(List<List<String>> groups) {
        List<List<String>> copy = new ArrayList<>();
        for (List<String> g : groups) {
            List<String> sorted = new ArrayList<>(g);
            sorted.sort(String::compareTo);
            copy.add(sorted);
        }
        copy.sort(Comparator.comparing(g -> String.join(",", g)));
        return copy;
    }

    public static void main(String[] args) {
        int failed = 0;
        List<List<String>> expected = List.of(
                List.of("bat"),
                List.of("nat", "tan"),
                List.of("ate", "eat", "tea"));
        failed += Checks.check("classic", Checks.same(
                normalizeGroups(groupAnagrams(new String[] {"eat", "tea", "tan", "ate", "nat", "bat"})),
                normalizeGroups(expected)));
        failed += Checks.check("empty strings", groupAnagrams(new String[] {""}).size() == 1);
        failed += Checks.check("single", Checks.same(
                normalizeGroups(groupAnagrams(new String[] {"a"})),
                normalizeGroups(List.of(List.of("a")))));
        Checks.printResult(failed);
    }
}
