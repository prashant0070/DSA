package revision.patterns;

/**
 * LEARN: Decorator — same WebDriver interface, adds behavior around every call.
 * Stack: LoggingDriver → ScreenshotDriver → real driver.
 */
public final class LoggingDriverDecorator implements WebDriver {

    private final WebDriver delegate;

    public LoggingDriverDecorator(WebDriver delegate) {
        this.delegate = delegate;
    }

    @Override
    public void get(String url) {
        System.out.println("LOG navigate " + url);
        delegate.get(url);
    }

    @Override
    public void quit() {
        System.out.println("LOG quit");
        delegate.quit();
    }
}
