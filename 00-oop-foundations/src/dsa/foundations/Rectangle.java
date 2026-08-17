package dsa.foundations;

/**
 * LEARN: another Shape — same methods, different formulas.
 *
 * Demo sums {@code shape.area()} in a loop. It does not care whether the
 * runtime object is a Circle or a Rectangle. Add Triangle later without
 * changing that loop (Open/Closed in SOLID).
 */
public final class Rectangle extends Shape {

    private final double width;
    private final double height;

    public Rectangle(double width, double height) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("width and height must be positive");
        }
        this.width = width;
        this.height = height;
    }

    public double width() {
        return width;
    }

    public double height() {
        return height;
    }

    @Override
    public double area() {
        return width * height;
    }

    @Override
    public double perimeter() {
        return 2 * (width + height);
    }
}
