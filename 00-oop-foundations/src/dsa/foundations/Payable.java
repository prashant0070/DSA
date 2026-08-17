package dsa.foundations;

/**
 * LEARN: interface = a capability, not a parent class.
 *
 * A class can {@code extend} only one class, but {@code implement} many
 * interfaces. {@link Invoice} is a record that implements Payable. A future
 * {@code SalariedEmployee} could implement Payable without extending Invoice.
 *
 * In Phase 1, {@code Stack<T>} will be an interface for the same reason:
 * ArrayStack and LinkedStack share a contract, not a family tree.
 *
 * Methods in an interface are public and abstract by default — no body,
 * no {@code public abstract} needed.
 */
public interface Payable {

    int payAmountCents();
}
