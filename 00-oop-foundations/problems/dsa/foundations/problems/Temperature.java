package dsa.foundations.problems;

/**
 * Problem 1 — encapsulation and invariants.
 *
 * Spec (try this yourself before reading the code below):
 * <ul>
 *   <li>Store temperature in ONE unit internally (Celsius).</li>
 *   <li>Expose both Celsius and Fahrenheit.</li>
 *   <li>Reject anything below absolute zero (-273.15 °C).</li>
 *   <li>Offer a factory {@code fromFahrenheit} so callers who have °F
 *       do not do the math themselves.</li>
 * </ul>
 *
 * Why one internal unit? If you stored both C and F as fields, they could
 * drift apart. One field is the source of truth; the other is computed.
 *
 * Run: {@code java -cp out dsa.foundations.problems.Temperature}
 */
public final class Temperature {

    // Named constant: avoids a magic number scattered in the class.
    private static final double ABSOLUTE_ZERO_C = -273.15;

    private final double celsius; // source of truth; F is always derived

    public Temperature(double celsius) {
        if (celsius < ABSOLUTE_ZERO_C) {
            throw new IllegalArgumentException("below absolute zero");
        }
        this.celsius = celsius;
    }

    /**
     * Factory method: an alternate way to construct, named for the input unit.
     * {@code static} because it does not use an existing Temperature — it
     * creates a new one.
     */
    public static Temperature fromFahrenheit(double fahrenheit) {
        return new Temperature((fahrenheit - 32) * 5.0 / 9.0);
    }

    public double celsius() {
        return celsius;
    }

    public double fahrenheit() {
        return celsius * 9.0 / 5.0 + 32;
    }

    public static void main(String[] args) {
        int failed = 0;
        Temperature freezing = new Temperature(0);
        failed += check("freezing C", almostEqual(freezing.celsius(), 0));
        failed += check("freezing F", almostEqual(freezing.fahrenheit(), 32));

        Temperature boilingF = Temperature.fromFahrenheit(212);
        failed += check("boiling from F", almostEqual(boilingF.celsius(), 100));

        failed += check("absolute zero allowed", canConstruct(-273.15));
        failed += check("below absolute zero rejected", !canConstruct(-273.16));

        printResult(failed);
    }

    private static boolean canConstruct(double celsius) {
        try {
            new Temperature(celsius);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    // Doubles are approximate; never test them with ==
    private static boolean almostEqual(double actual, double expected) {
        return Math.abs(actual - expected) < 1e-9;
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
