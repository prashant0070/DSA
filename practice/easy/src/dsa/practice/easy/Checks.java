package dsa.practice.easy;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/** Shared grader for easy problems. Not a problem itself. */
final class Checks {

    private Checks() {}

    static int check(String name, boolean ok) {
        if (!ok) {
            System.out.println("FAIL: " + name);
            return 1;
        }
        return 0;
    }

    static boolean same(int[] actual, int[] expected) {
        return Arrays.equals(actual, expected);
    }

    static boolean same(int[][] actual, int[][] expected) {
        return Arrays.deepEquals(actual, expected);
    }

    static boolean same(List<?> actual, List<?> expected) {
        return Objects.equals(actual, expected);
    }

    static void printResult(int failed) {
        if (failed == 0) {
            System.out.println("All checks passed.");
        } else {
            System.out.println(failed + " check(s) failed.");
            System.exit(1);
        }
    }
}
