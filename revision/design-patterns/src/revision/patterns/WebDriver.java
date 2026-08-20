package revision.patterns;

/**
 * LEARN: minimal stand-in for org.openqa.selenium.WebDriver.
 * Strategy and Factory examples depend on this interface, not a real browser.
 */
public interface WebDriver {

    void get(String url);

    void quit();
}
