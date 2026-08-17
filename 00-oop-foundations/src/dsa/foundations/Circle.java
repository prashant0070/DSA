package dsa.foundations;

/**
 * LEARN: inheritance ({@code extends}) and overriding.
 *
 * Circle <em>is a</em> Shape, so a Circle can sit in a {@code Shape} variable
 * or a {@code Shape[]} array. That is polymorphism.
 *
 * {@code @Override} tells the compiler: this method replaces Shape's abstract
 * {@code area()} / {@code perimeter()}. If you typo the name, the compiler fails
 * instead of silently adding a new unused method.
 */
public final class Circle extends Shape {

    private final double radius;

    public Circle(double radius) {
        if (radius <= 0) {
            throw new IllegalArgumentException("radius must be positive");
        }
        this.radius = radius;
    }

    public double radius() {
        return radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }

    @Override
    public double perimeter() {
        return 2 * Math.PI * radius;
    }
}
