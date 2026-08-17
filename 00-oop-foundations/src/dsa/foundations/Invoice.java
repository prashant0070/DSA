package dsa.foundations;

/**
 * LEARN: {@code record} = a value object (the type <em>is</em> its data).
 *
 * Java generates: constructor, {@code id()}, {@code amountCents()},
 * {@code equals}, {@code hashCode}, {@code toString}.
 *
 * Two invoices with the same id and amount are {@code equals} — unlike
 * {@link BankAccount}, where two objects with the same balance are still
 * different accounts.
 *
 * The block {@code public Invoice { ... }} is a compact constructor: it runs
 * validation, then Java assigns the components. You do not write
 * {@code this.id = id} yourself.
 */
public record Invoice(String id, int amountCents) implements Payable {

    public Invoice {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("id is required");
        }
        if (amountCents < 0) {
            throw new IllegalArgumentException("amountCents must be >= 0");
        }
    }

    @Override
    public int payAmountCents() {
        return amountCents;
    }
}
