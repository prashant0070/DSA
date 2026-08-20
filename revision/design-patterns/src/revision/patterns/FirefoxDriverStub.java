package revision.patterns;

public final class FirefoxDriverStub implements WebDriver {

    @Override
    public void get(String url) {
        System.out.println("[firefox] GET " + url);
    }

    @Override
    public void quit() {
        System.out.println("[firefox] quit");
    }
}
