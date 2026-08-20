package dsa.practice.medium;

/**
 * LEARN
 * Topic: Graph
 * Pattern: Topological sort / cycle detection (DFS or Kahn)
 * Target complexity: O(V + E) time, O(V + E) space
 *
 * Run: {@code java -cp out dsa.practice.medium.CourseSchedule}
 */
public final class CourseSchedule {

    public static boolean canFinish(int numCourses, int[][] prerequisites) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("linear", canFinish(2, new int[][] {{1, 0}}));
        failed += Checks.check("cycle", !canFinish(2, new int[][] {{1, 0}, {0, 1}}));
        failed += Checks.check("no prereqs", canFinish(3, new int[][] {}));
        failed += Checks.check("chain", canFinish(4, new int[][] {{1, 0}, {2, 1}, {3, 2}}));
        Checks.printResult(failed);
    }
}
