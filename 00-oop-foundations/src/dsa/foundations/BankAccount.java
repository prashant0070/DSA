package dsa.foundations;

/**
 * LEARN: encapsulation.
 *
 * A class is a blueprint. Each {@code new BankAccount(...)} creates a separate
 * object in memory, with its own {@code owner} and {@code balanceCents}.
 *
 * Fields are {@code private} so callers cannot write {@code account.balanceCents = -50}.
 * They must go through {@link #deposit} / {@link #withdraw}, which keep the
 * invariant: balance is never negative, amounts are always positive.
 *
 * {@code final} on the class means nobody can {@code extend BankAccount}.
 * {@code final} on {@code owner} means the owner cannot change after construction.
 */
public final class BankAccount {

    // State: data this object remembers. "private" = only this class can touch it.
    private final String owner;
    private int balanceCents; // not final — deposits and withdrawals change it

    /**
     * Constructor: runs once when you write {@code new BankAccount("Ada")}.
     * {@code this.owner} is the field; {@code owner} is the parameter. Same name,
     * so {@code this.} is required to tell them apart.
     */
    public BankAccount(String owner) {
        if (owner == null || owner.isBlank()) {
            throw new IllegalArgumentException("owner is required");
        }
        this.owner = owner;
        this.balanceCents = 0; // start valid: empty account, not a negative one
    }

    // Getter: safe to expose a copy of the value. No setter for owner — it is fixed.
    public String owner() {
        return owner;
    }

    public int balanceCents() {
        return balanceCents;
    }

    public void deposit(int cents) {
        requirePositive(cents);
        balanceCents += cents;
    }

    public void withdraw(int cents) {
        requirePositive(cents);
        if (cents > balanceCents) {
            // IllegalStateException = the object is valid, but this action is not allowed now.
            throw new IllegalStateException("insufficient funds");
        }
        balanceCents -= cents;
    }

    // private + static: helper with no need for "this". Callers outside cannot use it.
    private static void requirePositive(int cents) {
        if (cents <= 0) {
            // IllegalArgumentException = the caller passed a bad value.
            throw new IllegalArgumentException("amount must be positive");
        }
    }
}
