package revision.patterns;

public final class ExplicitWaitStrategy implements WaitStrategy {

    private final long timeoutMs;

    public ExplicitWaitStrategy(long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    @Override
    public void untilVisible(String locator) {
        System.out.println("explicit wait up to " + timeoutMs + "ms for " + locator);
    }
}
