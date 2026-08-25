package java.fundamentals;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.PriorityQueue;
import java.util.Set;

/**
 * Walkthrough demos that match NOTES.md / STRINGS.md / COLLECTIONS.md.
 * Read the printed labels, then compare with the notes.
 */
public final class Demo {

    public static void main(String[] args) {
        section("1) primitives vs references");
        primitivesVsReferences();

        section("2) autoboxing");
        autoboxing();

        section("3) arrays");
        arrays();

        section("4) strings + pool");
        stringsAndPool();

        section("5) StringBuilder");
        stringBuilder();

        section("6) List / Set / Map");
        listSetMap();

        section("7) Deque + PriorityQueue");
        dequeAndHeap();

        section("8) removeIf (avoid CME)");
        removeSafely();

        section("9) streams");
        streams();
    }

    private static void section(String title) {
        System.out.println();
        System.out.println("==== " + title + " ====");
    }

    private static void primitivesVsReferences() {
        int a = 10;
        int b = a;
        b = 99;
        System.out.println("primitive a after b=99 → " + a); // 10

        int[] x = {1, 2, 3};
        int[] y = x;
        y[0] = 99;
        System.out.println("same array x[0] → " + x[0]); // 99
    }

    private static void autoboxing() {
        Integer a = 100;
        Integer b = 100;
        Integer c = 200;
        Integer d = 200;
        System.out.println("100 == 100 ? " + (a == b));
        System.out.println("200 == 200 ? " + (c == d));
        System.out.println("200 equals 200 ? " + c.equals(d));
    }

    private static void arrays() {
        int[] nums = {3, 1, 4};
        Arrays.sort(nums);
        System.out.println("sorted → " + Arrays.toString(nums));

        List<Integer> growable = new ArrayList<>(Arrays.asList(1, 2, 3));
        growable.add(4);
        System.out.println("growable list → " + growable);
    }

    private static void stringsAndPool() {
        String s = "hi";
        System.out.println("toUpperCase discarded, s → " + s);
        s = s.toUpperCase();
        System.out.println("after reassign → " + s);

        String litA = "hello";
        String litB = "hello";
        String heap = new String("hello");
        System.out.println("literal == literal ? " + (litA == litB));
        System.out.println("literal == new ? " + (litA == heap));
        System.out.println("equals new ? " + litA.equals(heap));
        System.out.println("null-safe equals ? " + Objects.equals(null, "a"));
    }

    private static void stringBuilder() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            sb.append(i);
        }
        System.out.println("builder → " + sb);
        System.out.println("reversed → " + sb.reverse());
    }

    private static void listSetMap() {
        List<String> names = new ArrayList<>();
        names.add("Ada");
        names.add(0, "Zoe");
        System.out.println("list → " + names);

        Set<Integer> ids = new HashSet<>();
        ids.add(1);
        ids.add(1);
        System.out.println("set → " + ids);

        Map<String, Integer> freq = new HashMap<>();
        for (String word : List.of("to", "be", "or", "not", "to", "be")) {
            freq.merge(word, 1, Integer::sum);
        }
        System.out.println("freq → " + freq);

        Map<String, Integer> ordered = new LinkedHashMap<>();
        ordered.put("first", 1);
        ordered.put("second", 2);
        System.out.println("linkedHashMap → " + ordered);
    }

    private static void dequeAndHeap() {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);
        stack.push(2);
        System.out.println("stack pop → " + stack.pop());

        Deque<String> queue = new ArrayDeque<>();
        queue.offer("A");
        queue.offer("B");
        System.out.println("queue poll → " + queue.poll());

        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        minHeap.addAll(List.of(5, 1, 3));
        System.out.println("minHeap peek → " + minHeap.peek());

        PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
        maxHeap.addAll(List.of(5, 1, 3));
        System.out.println("maxHeap peek → " + maxHeap.peek());
    }

    private static void removeSafely() {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4));
        list.removeIf(n -> n % 2 == 0);
        System.out.println("after removeIf → " + list);

        list = new ArrayList<>(List.of(1, 2, 3, 4));
        Iterator<Integer> it = list.iterator();
        while (it.hasNext()) {
            if (it.next() % 2 == 0) {
                it.remove();
            }
        }
        System.out.println("after Iterator.remove → " + list);
    }

    private static void streams() {
        List<Integer> result = List.of(1, 2, 3, 4, 5, 6).stream()
                .filter(n -> n % 2 == 0)
                .map(n -> n * 10)
                .toList();
        System.out.println("stream evens*10 → " + result);
    }
}
