# DSA patterns — full notes

**Before:** [02-complexity](../02-complexity/NOTES.md) — analyze every pattern’s time/space  
**Practice:** [easy](../practice/easy/README.md) then [medium](../practice/medium/README.md)

Each section: **recognize → template → complexity → example problems**

---

## 1. Linear scan

**Recognize:** Single answer from one pass; running min/max/sum/streak.

**Template:**

```java
int best = ...;
for (int x : nums) {
    best = Math.max(best, ...); // or min, or streak logic
}
```

**Complexity:** O(n) time, O(1) space  
**Easy:** MaxElement, BestTimeToBuySellStock, MaxConsecutiveOnes  
**Medium:** MaximumSubarray (Kadane)

---

## 2. Prefix sum

**Recognize:** Range sum queries; subarray sum equals K; count subarrays.

**Template:**

```java
int[] prefix = new int[n + 1];
for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
// sum(i..j) = prefix[j + 1] - prefix[i]
```

**Complexity:** O(n) build, O(1) per query; subarray problems often O(n) with HashMap of prefix counts  
**Easy:** RunningSum  
**Medium:** SubarraySumEqualsK, ProductExceptSelf (variant)

---

## 3. Two pointers (same direction or opposite)

**Recognize:** Sorted array pair sum; remove duplicates; palindrome; merge; container area.

**Opposite ends (sorted):**

```java
int l = 0, r = n - 1;
while (l < r) {
    int sum = nums[l] + nums[r];
    if (sum == target) ...
    else if (sum < target) l++;
    else r--;
}
```

**Same direction (write index):** MoveZeroes, RemoveDuplicates  
**Complexity:** Usually O(n), O(1) space  
**Easy:** TwoSumSorted, ValidPalindrome, ReverseArray  
**Medium:** ThreeSum, ContainerWithMostWater, SortColors

---

## 4. Sliding window — fixed size k

**Recognize:** “Maximum sum/average of subarray of size k”; max in each window (needs deque for O(n)).

**Template:**

```java
int window = 0;
for (int i = 0; i < k; i++) window += nums[i];
int best = window;
for (int i = k; i < n; i++) {
    window += nums[i] - nums[i - k];
    best = Math.max(best, window);
}
```

**Complexity:** O(n) time  
**Easy:** MaxSumOfK  
**Medium:** SlidingWindowMaximum (monotonic deque)

---

## 5. Sliding window — variable size

**Recognize:** “Longest substring without repeat”; “minimum window substring”; shrink when invalid.

**Template:**

```java
Map<Character, Integer> freq = new HashMap<>();
int left = 0, best = 0;
for (int right = 0; right < s.length(); right++) {
    // add s[right], maybe shrink from left until valid
    while (invalid) {
        remove s[left];
        left++;
    }
    best = Math.max(best, right - left + 1);
}
```

**Complexity:** O(n) — each char enters/leaves once  
**Medium:** LongestSubstringWithoutRepeating, MinimumWindowSubstring

---

## 6. Hash map / set

**Recognize:** Need O(1) lookup; frequency; complement; seen before.

**Patterns:**

- Complement: Two Sum → `target - x`  
- Frequency: ValidAnagram, GroupAnagrams  
- First unique: FirstUniqueChar  
- Index map: ContainsNearbyDuplicate  

**Complexity:** O(n) time, O(n) space average  
**Easy:** TwoSum, ContainsDuplicate, ValidAnagram  
**Medium:** GroupAnagrams, SubarraySumEqualsK, TopKFrequent

---

## 7. Binary search

**Recognize:** Sorted array; “find first/last”; “min capacity” / answer space monotonic.

**Standard:**

```java
int lo = 0, hi = n - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (nums[mid] == target) return mid;
    else if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;
```

**On answer:** binary search `lo..hi` on value, `can(x)` predicate.  
**Complexity:** O(log n) per search  
**Easy:** BinarySearch, SearchInsertPosition, SqrtX  
**Medium:** SearchRotatedSortedArray, KokoEatingBananas

---

## 8. Stack

**Recognize:** Matching brackets; monotonic next greater; parse nested (decode string).

**Monotonic stack:** decreasing stack for next greater element.  
**Complexity:** O(n) — each element pushed/popped once  
**Easy:** ValidParentheses, NextGreaterElement  
**Medium:** DailyTemperatures, DecodeString, LargestRectangleInHistogram

---

## 9. Queue / BFS

**Recognize:** Shortest path unweighted; level order; spread from multiple sources.

**Template:**

```java
Queue<int[]> q = new ArrayDeque<>();
q.add(start);
while (!q.isEmpty()) {
    int size = q.size(); // level by level
    for (int i = 0; i < size; i++) {
        var cur = q.poll();
        for (neighbor : neighbors) q.add(neighbor);
    }
}
```

**Complexity:** O(V + E) graphs, O(n) grid BFS  
**Easy:** FloodFill  
**Medium:** NumberOfIslands, BinaryTreeLevelOrder, RottingOranges

---

## 10. DFS (graph / grid / tree)

**Recognize:** Explore all paths; connected components; tree recursion.

**Grid DFS:**

```java
void dfs(int r, int c) {
    if (out of bounds || visited || blocked) return;
    visited[r][c] = true;
    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
}
```

**Complexity:** O(cells) or O(V + E)  
**Medium:** NumberOfIslands, MaxAreaOfIsland, PathSum variants

---

## 11. Linked list — pointers

**Recognize:** Reverse, cycle, merge, nth from end, reorder.

**Complexity:** O(n) time, O(1) extra for in-place pointer tricks  
**Easy:** ReverseLinkedList, LinkedListCycle  
**Medium:** AddTwoNumbers, ReorderList, CopyListWithRandomPointer

---

## 12. Trees — recursion

**Recognize:** Height, invert, same tree, path sum, BST property.

**BST:** left < root < right — use for O(log n) search in balanced tree.  
**Easy:** MaxDepth, Invert, LCA BST  
**Medium:** ValidateBST, KthSmallestInBST, LowestCommonAncestor

---

## 13. Heap / priority queue

**Recognize:** K largest/smallest; merge K lists; median stream; scheduling.

**Top K frequent:**

```java
PriorityQueue<Map.Entry<Integer,Integer>> minHeap = ...
// keep size k, poll smallest when size > k
```

**Complexity:** O(n log k)  
**Easy:** LastStoneWeight, KthLargest  
**Medium:** TopKFrequent, KClosestPointsToOrigin, MergeKSortedLists

---

## 14. Intervals

**Recognize:** Merge overlapping; insert interval; meeting rooms; sweep line.

**Merge:**

```java
Arrays.sort(intervals, (a,b) -> a[0] - b[0]);
// merge if overlap
```

**Medium:** MergeIntervals, NonOverlappingIntervals, MeetingRoomsII

---

## 15. Greedy

**Recognize:** Local choice → global optimum (proof or intuition); intervals, jumps.

**Easy:** AssignCookies, LemonadeChange  
**Medium:** JumpGame, GasStation, TaskScheduler

---

## 16. 1D dynamic programming

**Recognize:** “Count ways”; “max profit”; Fibonacci-style; pick/skip.

**Template:**

```java
int[] dp = new int[n + 1];
dp[0] = base;
for (int i = 1; i <= n; i++)
    dp[i] = /* best using dp[i-1], dp[i-2], ... */;
```

**Easy:** ClimbingStairs, HouseRobber  
**Medium:** CoinChange, LongestIncreasingSubsequence, WordBreak

---

## 17. 2D DP (grid)

**Recognize:** Paths in grid; edit distance; knapsack 2D table.

**Medium:** UniquePaths, MinimumPathSum, EditDistance

---

## 18. Backtracking

**Recognize:** Generate all subsets/permutations/combinations; constraints (N-queens).

**Template:**

```java
void backtrack(path, choices) {
    if (complete) { result.add(copy); return; }
    for (choice : choices) {
        path.add(choice);
        backtrack(path, nextChoices);
        path.remove(path.size() - 1);
    }
}
```

**Complexity:** Often exponential output  
**Medium:** Subsets, Permutations, CombinationSum, LetterCombinations

---

## 19. Trie

**Recognize:** Prefix search; autocomplete; word dictionary.

**Medium:** ImplementTrie, WordSearchII

---

## 20. Union-Find (DSU)

**Recognize:** Dynamic connectivity; count components; redundant edge.

**Medium:** NumberOfProvinces, RedundantConnection

---

## Pattern picker (interview)

| Problem clue | Try |
| --- | --- |
| Pair in array | Hash map or two pointers if sorted |
| Subarray sum/count | Prefix sum + map |
| Longest/shortest substring | Variable sliding window |
| Sorted / find boundary | Binary search |
| Tree level / shortest path | BFS |
| Explore all connections | DFS/BFS |
| K largest | Heap |
| Overlapping ranges | Sort intervals + merge |
| All combinations | Backtracking |
| Prefix of words | Trie |

---

## Study order

1. Finish [easy](../practice/easy/README.md) implementations  
2. Read this doc once  
3. For each [medium](../practice/medium/README.md) problem, name the pattern before coding  
4. Write Time/Space in every solution ([02-complexity](../02-complexity/NOTES.md))

Next phases (build your own structures): [CURRICULUM.md](../CURRICULUM.md) Phase 01–10.
