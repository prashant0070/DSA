package revision.patterns;

/** Playwright-style auto-wait stub — still a Strategy implementation. */
public final class NoWaitStrategy implements WaitStrategy {

    @Override
    public void untilVisible(String locator) {
        System.out.println("auto-wait (no extra poll) for " + locator);
    }
}
