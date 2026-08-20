package dsa.practice.easy;

import java.util.List;

/**
 * LEARN
 * Topic: Math
 * Logic: FizzBuzz. For i in 1..n: multiple of 15 → "FizzBuzz", of 3 → "Fizz", of 5 → "Buzz", else the number as a string.
 * Check 15 first so you do not miss the overlap.
 *
 * Run: {@code java -cp out dsa.practice.easy.FizzBuzz}
 */
public final class FizzBuzz {

    public static List<String> fizzBuzz(int n) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("3", Checks.same(fizzBuzz(3), List.of("1", "2", "Fizz")));
        failed += Checks.check("5", Checks.same(fizzBuzz(5), List.of("1", "2", "Fizz", "4", "Buzz")));
        failed += Checks.check("15 fizzbuzz", "FizzBuzz".equals(fizzBuzz(15).get(14)));
        Checks.printResult(failed);
    }
}
