package dsa.practice.easy;

/**
 * LEARN
 * Topic: Arrays
 * Logic: two pointers on a sorted array of squares.
 * After squaring, the largest values sit at the ends (negatives). Fill a new array
 * from the back: pick the larger of {@code left^2} and {@code right^2}.
 *
 * Run: {@code java -cp out dsa.practice.easy.SquaresOfSortedArray}
 */
public final class SquaresOfSortedArray {

    public static int[] sortedSquares(int[] nums) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("mixed", Checks.same(sortedSquares(new int[] {-4, -1, 0, 3, 10}), new int[] {0, 1, 9, 16, 100}));
        failed += Checks.check("positive", Checks.same(sortedSquares(new int[] {1, 2, 3}), new int[] {1, 4, 9}));
        failed += Checks.check("negative", Checks.same(sortedSquares(new int[] {-7, -3, -1}), new int[] {1, 9, 49}));
        Checks.printResult(failed);
    }
}
