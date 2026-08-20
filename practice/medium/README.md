# Medium DSA practice

**You implement** every solution. Read [03-dsa-patterns/NOTES.md](../../03-dsa-patterns/NOTES.md) and name the pattern before you code.  
Analyze time/space using [02-complexity/NOTES.md](../../02-complexity/NOTES.md).

```bash
javac -d out src/dsa/practice/medium/*.java
java -cp out dsa.practice.medium.MaximumSubarray
```

## Suggested order

| # | Class | Pattern | Typical complexity |
| --- | --- | --- | --- |
| 1 | `MaximumSubarray` | Kadane / linear scan | O(n) time, O(1) space |
| 2 | `ProductExceptSelf` | Prefix/suffix | O(n), O(1) extra |
| 3 | `LongestSubstringWithoutRepeating` | Variable sliding window | O(n) |
| 4 | `GroupAnagrams` | Hash map + sort/key | O(n × k log k) |
| 5 | `SubarraySumEqualsK` | Prefix + map | O(n) |
| 6 | `ThreeSum` | Sort + two pointers | O(n²) |
| 7 | `ContainerWithMostWater` | Two pointers | O(n) |
| 8 | `SortColors` | Dutch national flag | O(n) |
| 9 | `SearchRotatedSortedArray` | Binary search variant | O(log n) |
| 10 | `MergeIntervals` | Sort + merge | O(n log n) |
| 11 | `NumberOfIslands` | Grid DFS/BFS | O(rows × cols) |
| 12 | `BinaryTreeLevelOrder` | BFS | O(n) |
| 13 | `ValidateBST` | DFS bounds | O(n) |
| 14 | `AddTwoNumbers` | Linked list | O(n) |
| 15 | `TopKFrequent` | Hash + heap | O(n log k) |
| 16 | `DailyTemperatures` | Monotonic stack | O(n) |
| 17 | `CoinChange` | 1D DP | O(amount × coins) |
| 18 | `WordBreak` | 1D DP | O(n²) |
| 19 | `UniquePaths` | 2D DP | O(m × n) |
| 20 | `JumpGame` | Greedy | O(n) |
| 21 | `LongestPalindromicSubstring` | Expand center | O(n²) |
| 22 | `KClosestPointsToOrigin` | Heap | O(n log k) |
| 23 | `CourseSchedule` | Topo sort / DFS cycle | O(V + E) |
| 24 | `RotateImage` | Matrix | O(n²) |
| 25 | `ImplementTrie` | Trie | O(word length) |

Helpers: `Checks.java`, `TreeNode.java`, `Node.java` — not problems.

Advanced track (later): `practice/advanced/`
