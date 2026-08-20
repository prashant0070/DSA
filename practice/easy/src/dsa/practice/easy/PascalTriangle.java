package dsa.practice.easy;

import java.util.List;

/**
 * LEARN
 * Topic: Dynamic programming
 * Logic: Pascal's triangle. Row i starts and ends with 1. Inner values are
 * row[i-1][j-1] + row[i-1][j]. Return the first {@code numRows} rows.
 *
 * Run: {@code java -cp out dsa.practice.easy.PascalTriangle}
 */
public final class PascalTriangle {

    public static List<List<Integer>> generate(int numRows) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        List<List<Integer>> five = generate(5);
        failed += Checks.check("rows", five.size() == 5);
        failed += Checks.check("row0", Checks.same(five.get(0), List.of(1)));
        failed += Checks.check("row4", Checks.same(five.get(4), List.of(1, 4, 6, 4, 1)));
        Checks.printResult(failed);
    }
}
