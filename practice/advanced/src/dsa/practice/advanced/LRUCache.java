package dsa.practice.advanced;

/**
 * LEARN
 * Topic: Design
 * Pattern: HashMap + doubly linked list (or LinkedHashMap access-order)
 * get/put O(1). Evict least-recently-used when capacity exceeded.
 *
 * Run: {@code java -cp out dsa.practice.advanced.LRUCache}
 */
public final class LRUCache {

    private final int capacity;

    public LRUCache(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        throw new UnsupportedOperationException("implement me");
    }

    public void put(int key, int value) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        LRUCache cache = new LRUCache(2);
        cache.put(1, 1);
        cache.put(2, 2);
        failed += Checks.check("get 1", cache.get(1) == 1);
        cache.put(3, 3);
        failed += Checks.check("evict 2", cache.get(2) == -1);
        cache.put(4, 4);
        failed += Checks.check("evict 1", cache.get(1) == -1);
        failed += Checks.check("get 3", cache.get(3) == 3);
        failed += Checks.check("get 4", cache.get(4) == 4);
        Checks.printResult(failed);
    }
}
