package dsa.practice.advanced;

import java.util.ArrayList;
import java.util.List;

public final class GraphNode {
    public int val;
    public List<GraphNode> neighbors;

    public GraphNode(int val) {
        this.val = val;
        this.neighbors = new ArrayList<>();
    }
}
