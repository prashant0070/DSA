package dsa.linear;

/**
 * Run: java -cp out dsa.linear.Demo
 */
public final class Demo {

    public static void main(String[] args) {
        stackDemo();
        queueDemo();
        listDemo();
    }

    private static void stackDemo() {
        Stack<String> stack = new ArrayStack<>();
        stack.push("a");
        stack.push("b");
        System.out.println("stack peek=" + stack.peek() + " pop=" + stack.pop());
        Stack<Integer> linked = new LinkedStack<>();
        linked.push(1);
        linked.push(2);
        System.out.println("linked stack pop=" + linked.pop());
    }

    private static void queueDemo() {
        Queue<String> q = new ArrayQueue<>();
        q.offer("first");
        q.offer("second");
        System.out.println("queue poll=" + q.poll() + " peek=" + q.peek());
    }

    private static void listDemo() {
        SinglyLinkedList<Integer> list = new SinglyLinkedList<>();
        list.addFirst(3);
        list.addFirst(2);
        list.addFirst(1);
        System.out.print("list (head first):");
        for (int x : list) {
            System.out.print(" " + x);
        }
        System.out.println(" — implement reverseInPlace() in problem 2");
    }
}
