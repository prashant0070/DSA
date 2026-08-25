package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Intervals + heap
 * Pattern: Sort by start; min-heap of end times; pop if start >= min end
 * Target: O(n log n) time
 *
 * Run: {@code java -cp out dsa.practice.advanced.MeetingRoomsII}
 */
public final class MeetingRoomsII {

    public static int minMeetingRooms(int[][] intervals) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("overlap 2", minMeetingRooms(new int[][] {{0, 30}, {5, 10}, {15, 20}}) == 2);
        failed += Checks.check("overlap 1", minMeetingRooms(new int[][] {{7, 10}, {2, 4}}) == 1);
        failed += Checks.check("empty", minMeetingRooms(new int[][] {}) == 0);
        Checks.printResult(failed);
    }
}
