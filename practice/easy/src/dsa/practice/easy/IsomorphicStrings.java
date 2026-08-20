package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings + hashing
 * Logic: two maps (or a map + a set).
 * {@code s} and {@code t} are isomorphic if each char in s maps to one char in t and vice versa.
 * {@code egg → add} yes, {@code foo → bar} no (o would map to both a and r).
 *
 * Run: {@code java -cp out dsa.practice.easy.IsomorphicStrings}
 */
public final class IsomorphicStrings {

    public static boolean isIsomorphic(String s, String t) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("egg", isIsomorphic("egg", "add"));
        failed += Checks.check("foo", !isIsomorphic("foo", "bar"));
        failed += Checks.check("paper", isIsomorphic("paper", "title"));
        failed += Checks.check("bad reverse", !isIsomorphic("badc", "baba"));
        Checks.printResult(failed);
    }
}
