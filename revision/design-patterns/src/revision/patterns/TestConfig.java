package revision.patterns;

/**
 * LEARN: Builder — many optional fields, readable at the call site, validate before build.
 */
public final class TestConfig {

    private final String baseUrl;
    private final Browser browser;
    private final boolean headless;
    private final long defaultTimeoutMs;

    private TestConfig(Builder builder) {
        this.baseUrl = builder.baseUrl;
        this.browser = builder.browser;
        this.headless = builder.headless;
        this.defaultTimeoutMs = builder.defaultTimeoutMs;
    }

    public String baseUrl() {
        return baseUrl;
    }

    public Browser browser() {
        return browser;
    }

    public boolean headless() {
        return headless;
    }

    public long defaultTimeoutMs() {
        return defaultTimeoutMs;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String baseUrl = "http://localhost";
        private Browser browser = Browser.CHROME;
        private boolean headless = false;
        private long defaultTimeoutMs = 30_000;

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder browser(Browser browser) {
            this.browser = browser;
            return this;
        }

        public Builder headless(boolean headless) {
            this.headless = headless;
            return this;
        }

        public Builder defaultTimeoutMs(long defaultTimeoutMs) {
            this.defaultTimeoutMs = defaultTimeoutMs;
            return this;
        }

        public TestConfig build() {
            if (baseUrl == null || baseUrl.isBlank()) {
                throw new IllegalStateException("baseUrl is required");
            }
            return new TestConfig(this);
        }
    }
}
