# Advanced DSA practice (Amazon / Apple SDET III bar)

**You implement** every solution. These fill gaps after [medium](medium/README.md) for **Amazon SDET III**, **Lead**, and strong **Apple** coding rounds.

**Before each problem:** name the pattern in [03-dsa-patterns/NOTES.md](../../03-dsa-patterns/NOTES.md).  
**Q&A:** [CODING-INTERVIEW-QA.md](../CODING-INTERVIEW-QA.md) · **Plan:** [AMAZON-APPLE-SDET3-CHECKLIST.md](../../AMAZON-APPLE-SDET3-CHECKLIST.md)

```bash
javac -d out src/dsa/practice/advanced/*.java
java -cp out dsa.practice.advanced.LRUCache
```

Helpers (not problems): `Checks.java`, `Node.java`, `TreeNode.java`, `GraphNode.java`.

## Suggested order

| # | Class | Pattern | Amazon / Apple signal |
| --- | --- | --- | --- |
| 1 | `LRUCache` | Design + HashMap + DLL | Very common design |
| 2 | `TrappingRainWater` | Two pointers / stack | Amazon medium-hard |
| 3 | `SlidingWindowMaximum` | Monotonic deque | Hard window |
| 4 | `MinimumWindowSubstring` | Variable window | Amazon favorite |
| 5 | `MergeKSortedLists` | Heap | Amazon / Google |
| 6 | `Subsets` | Backtracking | Classic |
| 7 | `Permutations` | Backtracking | Classic |
| 8 | `CombinationSum` | Backtracking | Amazon |
| 9 | `WordSearch` | Backtracking DFS | Apple / Amazon |
| 10 | `SerializeDeserializeBinaryTree` | Design + BFS/DFS | Apple OOP signal |
| 11 | `LowestCommonAncestorBinaryTree` | Tree post-order | Very common |
| 12 | `BinaryTreeMaximumPathSum` | Tree DP | Amazon |
| 13 | `CloneGraph` | Graph BFS + map | Meta / Amazon |
| 14 | `WordLadder` | BFS shortest path | Amazon |
| 15 | `PacificAtlanticWaterFlow` | Graph DFS multi-source | Medium-hard grid |
| 16 | `MeetingRoomsII` | Heap / sweep | Interval + heap |
| 17 | `LongestIncreasingSubsequence` | DP / patience sort | DP classic |
| 18 | `PartitionEqualSubsetSum` | 0/1 knapsack DP | Amazon DP |
| 19 | `DecodeWays` | 1D DP | Amazon string DP |
| 20 | `CheapestFlightsWithinKStops` | Graph + DP / BFS | Amazon graph |

## Timed practice

- **Week 8+** in checklist: 35–40 min per problem, no autocomplete.  
- If stuck 10 min, read pattern in CODING-INTERVIEW-QA, then retry next day.

## Still outside repo (LeetCode extras)

Largest rectangle in histogram, median of two sorted arrays, regex matching, word search II, alien dictionary.
