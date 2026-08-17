package dsa.foundations;

/**
 * LEARN: abstract class = a family of types that share a contract.
 *
 * You cannot write {@code new Shape()} — there is no generic shape.
 * You write {@code new Circle(2)} or {@code new Rectangle(3, 4)}.
 *
 * {@code abstract} methods have no body here. Each subclass MUST implement them
 * ({@code @Override}). That is how {@code Shape s = new Circle(2); s.area()}
 * runs Circle's formula, not a dummy one.
 *
 * Use an abstract class when subtypes are a real family and may later share
 * fields or helper methods. Use an interface ({@link Payable}) for a capability.
 */
public abstract class Shape {

    public abstract double area();

    public abstract double perimeter();
}
