package dsa.foundations.problems;

import dsa.foundations.Invoice;
import dsa.foundations.Payable;

/**
 * Problem 2 — polymorphism through an interface.
 *
 * Spec: sum {@code payAmountCents()} over any mix of {@link Payable} objects.
 * The method parameter is {@code Payable[]}, not {@code Invoice[]}.
 * That way a Bonus (below) works without changing {@link #sumCents}.
 *
 * This is Dependency Inversion (SOLID D): depend on the abstraction.
 *
 * Run: {@code java -cp out dsa.foundations.problems.TotalPay}
 */
public final class TotalPay {

    // Utility class: only static methods, so hide the constructor.
    private TotalPay() {}

    public static int sumCents(Payable[] payables) {
        if (payables == null) {
            throw new IllegalArgumentException("payables is required");
        }
        int total = 0;
        for (Payable payable : payables) {
            if (payable == null) {
                throw new IllegalArgumentException("null payable");
            }
            // Runtime type may be Invoice or Bonus; we only call the interface.
            total += payable.payAmountCents();
        }
        return total;
    }

    /** A second Payable type so the test is not secretly Invoice-only. */
    private record Bonus(int cents) implements Payable {
        @Override
        public int payAmountCents() {
            return cents;
        }
    }

    public static void main(String[] args) {
        int failed = 0;

        Payable[] empty = {};
        failed += check("empty", sumCents(empty) == 0);

        Payable[] mixed = {
                new Invoice("A", 1000),
                new Bonus(250),
                new Invoice("B", 50)
        };
        failed += check("mixed payables", sumCents(mixed) == 1300);

        boolean threw = false;
        try {
            sumCents(null);
        } catch (IllegalArgumentException e) {
            threw = true;
        }
        failed += check("null array rejected", threw);

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
