package revision.patterns;

/**
 * Run from revision/design-patterns:
 * javac -d out src/revision/patterns/*.java
 * java -cp out revision.patterns.PatternDemo
 */
public final class PatternDemo {

    public static void main(String[] args) {
        factory();
        strategy();
        decorator();
        builder();
    }

    private static void factory() {
        WebDriver driver = DriverFactory.create(Browser.CHROME);
        driver.get("https://example.com/login");
        driver.quit();
    }

    private static void strategy() {
        WaitStrategy explicit = new ExplicitWaitStrategy(10_000);
        WaitStrategy auto = new NoWaitStrategy();
        explicit.untilVisible("#submit");
        auto.untilVisible("#submit");
    }

    private static void decorator() {
        WebDriver driver = new LoggingDriverDecorator(DriverFactory.create(Browser.FIREFOX));
        driver.get("https://example.com/home");
        driver.quit();
    }

    private static void builder() {
        TestConfig config = TestConfig.builder()
                .baseUrl("https://staging.example.com")
                .browser(Browser.CHROME)
                .headless(true)
                .defaultTimeoutMs(15_000)
                .build();
        System.out.println("config baseUrl=" + config.baseUrl() + " headless=" + config.headless());
    }
}
