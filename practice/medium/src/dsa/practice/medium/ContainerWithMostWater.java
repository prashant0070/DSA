package dsa.practice.medium;

/**
 * LEARN
 * Topic: Arrays
 * Pattern: Two pointers
 * Target complexity: O(n) time, O(1) space
 *
 * Run: {@code java -cp out dsa.practice.medium.ContainerWithMostWater}
 */
public final class ContainerWithMostWater {

    public static int maxArea(int[] height) {
        throw new UnsupportedOperationException("implement me");
    }

    public static void main(String[] args) {
        int failed = 0;
        failed += Checks.check("classic", maxArea(new int[] {1, 8, 6, 2, 5, 4, 8, 3, 7}) == 49);
        failed += Checks.check("two bars", maxArea(new int[] {1, 1}) == 1);
        failed += Checks.check("wide shallow", maxArea(new int[] {4, 3, 2, 1, 4}) == 16);
        Checks.printResult(failed);
    }
}
