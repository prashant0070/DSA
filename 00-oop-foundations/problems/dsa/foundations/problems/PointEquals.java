package dsa.foundations.problems;

import java.util.Objects;

/**
 * Problem 3 — {@code equals} and {@code hashCode} for a value object.
 *
 * Spec:
 * <ul>
 *   <li>Two points with the same x and y are equal.</li>
 *   <li>Equal points MUST have the same hashCode (hash map contract, Phase 2).</li>
 *   <li>{@code equals(null)} is false. {@code equals} of another type is false.</li>
 *   <li>{@code ==} is still identity: two {@code new Point(3, 4)} are different objects.</li>
 * </ul>
 *
 * {@code ==} on objects → same memory slot?<br>
 * {@code equals} → same meaning? (only if you define it)
 *
 * Run: {@code java -cp out dsa.foundations.problems.PointEquals}
 */
public final class PointEquals {

    public static final class Point {
        private final int x;
        private final int y;

        public Point(int x, int y) {
            this.x = x;
            this.y = y;
        }

        public int x() {
            return x;
        }

        public int y() {
            return y;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true; // same object in memory — trivially equal
            }
            // Pattern matching instanceof (Java 16+): false for null and other types,
            // and binds {@code point} if the check passes.
            if (!(other instanceof Point point)) {
                return false;
            }
            return x == point.x && y == point.y; // ints: == is fine (not objects)
        }

        @Override
        public int hashCode() {
            // Must use the SAME fields as equals. Objects.hash is the usual helper.
            return Objects.hash(x, y);
        }
    }

    public static void main(String[] args) {
        int failed = 0;
        Point a = new Point(3, 4);
        Point b = new Point(3, 4); // equal in value, different object
        Point c = new Point(4, 3);

        failed += check("same coordinates equal", a.equals(b));
        failed += check("symmetric", b.equals(a));
        failed += check("different coordinates not equal", !a.equals(c));
        failed += check("not equal to null", !a.equals(null));
        failed += check("not equal to other type", !a.equals("3,4"));
        failed += check("equal implies same hash", a.hashCode() == b.hashCode());
        failed += check("== is still identity", a != b);

        printResult(failed);
    }

    private static int check(String name, boolean ok) {
        if (!ok) {
            System.out.println("FAIL: " + name);
            return 1;
        }
        return 0;
    }

    private static void printResult(int failed) {
        if (failed == 0) {
            System.out.println("All checks passed.");
        } else {
            System.out.println(failed + " check(s) failed.");
            System.exit(1);
        }
    }
}
