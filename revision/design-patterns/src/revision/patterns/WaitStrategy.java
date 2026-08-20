package revision.patterns;

/**
 * LEARN: Strategy — swap how we wait without changing the test class hierarchy.
 */
public interface WaitStrategy {

    void untilVisible(String locator);
}
