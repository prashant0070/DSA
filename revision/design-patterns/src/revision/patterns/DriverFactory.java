package revision.patterns;

/**
 * LEARN: Factory — tests ask for a browser; they do not new ChromeDriverStub() everywhere.
 * Interview line: "Factory centralizes construction and env-specific setup."
 */
public final class DriverFactory {

    private DriverFactory() {}

    public static WebDriver create(Browser browser) {
        return switch (browser) {
            case CHROME -> new ChromeDriverStub();
            case FIREFOX -> new FirefoxDriverStub();
        };
    }
}
