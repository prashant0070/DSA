package revision.patterns;

/** Stub — real framework would wrap Selenium/Playwright here. */
public final class ChromeDriverStub implements WebDriver {

    @Override
    public void get(String url) {
        System.out.println("[chrome] GET " + url);
    }

    @Override
    public void quit() {
        System.out.println("[chrome] quit");
    }
}
