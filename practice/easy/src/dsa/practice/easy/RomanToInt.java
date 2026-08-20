package dsa.practice.easy;

/**
 * LEARN
 * Topic: Strings
 * Logic: map symbols, peek the next one.
 * If a smaller value sits before a larger one, it subtracts (IV=4, IX=9, XL=40…).
 * Otherwise add. Walk left to right (or right to left adding/subtracting).
 *
 * Run: {@code java -cp out dsa.practice.easy.RomanToInt}
 */
public final class RomanToInt {

    public static int romanToInt(String s) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("III", romanToInt("III") == 3);
        failed += Checks.check("LVIII", romanToInt("LVIII") == 58);
        failed += Checks.check("MCMXCIV", romanToInt("MCMXCIV") == 1994);
        Checks.printResult(failed);
    }
}
