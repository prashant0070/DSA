package dsa.practice.advanced;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

final class Checks {

    private Checks() {}

    static int check(String name, boolean ok) {
        if (!ok) {
            System.out.println("FAIL: " + name);
            return 1;
        }
        return 0;
    }

    static boolean same(int[] a, int[] b) {
        return Arrays.equals(a, b);
    }

    static boolean same(int[][] a, int[][] b) {
        return Arrays.deepEquals(a, b);
    }

    static boolean same(List<?> a, List<?> b) {
        return Objects.equals(a, b);
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
