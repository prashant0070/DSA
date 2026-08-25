package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Graph + DP
 * Pattern: Bellman-Ford K+1 relaxations, or BFS on (city, stopsUsed)
 * Cheapest price from src to dst with at most k stops.
 *
 * Run: {@code java -cp out dsa.practice.advanced.CheapestFlightsWithinKStops}
 */
public final class CheapestFlightsWithinKStops {

    public static int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        int[][] flights = {{0, 1, 100}, {1, 2, 100}, {0, 2, 500}};
        failed += Checks.check("one stop cheaper", findCheapestPrice(3, flights, 0, 2, 1) == 200);
        failed += Checks.check("direct only", findCheapestPrice(3, flights, 0, 2, 0) == 500);
        failed += Checks.check("no path", findCheapestPrice(3, new int[][] {{0, 1, 100}}, 0, 2, 1) == -1);
        Checks.printResult(failed);
    }
}
