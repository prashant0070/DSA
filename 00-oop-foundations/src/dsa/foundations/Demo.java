package dsa.foundations;

/**
 * LEARN: run this first. Each method below is a mini lesson.
 *
 * From {@code 00-oop-foundations}:
 * <pre>
 * javac -d out src/dsa/foundations/*.java problems/dsa/foundations/problems/*.java
 * java -cp out dsa.foundations.Demo
 * </pre>
 *
 * {@code public static void main} is the entry point. {@code static} means it
 * belongs to the class, not to one Demo object — the JVM can call it without
 * {@code new Demo()}.
 */
public final class Demo {

    public static void main(String[] args) {
        encapsulation();
        counterInvariant();
        shapePolymorphism();
        payablePolymorphism();
        generics();
    }

    /** Private fields + methods that reject illegal operations. */
    private static void encapsulation() {
        BankAccount account = new BankAccount("Ada");
        account.deposit(500);
        account.withdraw(120);
        System.out.println("BankAccount " + account.owner() + " balance = " + account.balanceCents());
        try {
            account.withdraw(9999); // should not empty the account into the negative
        } catch (IllegalStateException e) {
            System.out.println("  withdraw blocked: " + e.getMessage());
        }
    }

    /** Same idea as BankAccount: a rule that every method must keep true. */
    private static void counterInvariant() {
        Counter counter = new Counter(2);
        counter.increment();
        counter.increment();
        System.out.println("Counter value = " + counter.value() + " / " + counter.max());
        try {
            counter.increment();
        } catch (IllegalStateException e) {
            System.out.println("  increment blocked: " + e.getMessage());
        }
    }

    /**
     * Compile-time type is Shape; runtime type is Circle or Rectangle.
     * {@code shape.area()} picks the matching {@code @Override} at runtime.
     */
    private static void shapePolymorphism() {
        Shape[] shapes = { new Circle(2), new Rectangle(3, 4) };
        double total = 0;
        for (Shape shape : shapes) {
            total += shape.area();
        }
        System.out.printf("Shape[] total area = %.4f%n", total);
    }

    /**
     * Same idea with an interface. Also: two Invoice records with the same
     * data are {@code equals} (value objects). Two BankAccounts would not be.
     */
    private static void payablePolymorphism() {
        Payable[] payables = {
                new Invoice("INV-1", 2500),
                new Invoice("INV-2", 1500)
        };
        int total = 0;
        for (Payable payable : payables) {
            total += payable.payAmountCents();
        }
        System.out.println("Payable[] total cents = " + total);
        Invoice a = new Invoice("INV-1", 2500);
        Invoice b = new Invoice("INV-1", 2500);
        System.out.println("Invoice equals (value object) = " + a.equals(b));
    }

    /** T is String here. {@code names.get()} is already a String — no cast. */
    private static void generics() {
        Box<String> names = new Box<>();
        names.set("Ada");
        System.out.println("Box<String> = " + names.get());
    }
}
