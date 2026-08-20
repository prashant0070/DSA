package java.fundamentals;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Java fundamentals demo — run after reading NOTES.md */
public final class Demo {

    public static void main(String[] args) {
        arrays();
        strings();
        collections();
        streams();
    }

    private static void arrays() {
        int[] nums = {3, 1, 4};
        System.out.println("array length=" + nums.length);
    }

    private static void strings() {
        StringBuilder sb = new StringBuilder();
        for (char c : new char[] {'a', 'b', 'c'}) {
            sb.append(c);
        }
        System.out.println("builder=" + sb);
    }

    private static void collections() {
        Map<String, Integer> freq = new HashMap<>();
        for (String word : List.of("to", "be", "or", "not", "to", "be")) {
            freq.merge(word, 1, Integer::sum);
        }
        System.out.println("freq=" + freq);
    }

    private static void streams() {
        List<Integer> evens = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
        List<Integer> result = evens.stream().filter(n -> n % 2 == 0).map(n -> n * 10).toList();
        System.out.println("stream evens*10=" + result);
    }
}
