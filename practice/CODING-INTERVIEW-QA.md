# FAANG / Amazon / Apple — coding interview Q&A

**Audience:** SDET II → SDET III → Lead at Amazon, Apple, Google, Microsoft, Meta.  
**Use with:** [AMAZON-APPLE-SDET3-CHECKLIST.md](../AMAZON-APPLE-SDET3-CHECKLIST.md) · [easy](easy/README.md) · [medium](medium/README.md) · [advanced](advanced/README.md)

Answer **out loud** in 2–4 minutes per question, then check the outline.

---

## 1. How coding rounds differ (SDET vs SDE)

| | SDE loop | SDET III+ loop (Amazon especially) |
| --- | --- | --- |
| Difficulty | Medium–hard common | **Medium core**; sometimes hard |
| Patterns | Full DSA | Same patterns — **bar often SDE II–like at Amazon** |
| Follow-ups | Optimize, scale input | Same + “how would you test this?” occasionally |
| Language | Any | Java common for SDET — know collections cold |
| Apple | Medium possible | Often **1 coding** + heavy quality/framework |

**SDET bonus questions (not every round):**  
“How would you unit-test this?” → pure functions, edge cases, property-based for shuffle/sort.  
“How would you automate verification?” → golden files, API contract, not Selenium for pure algo.

---

## 2. Universal opening script (use every problem)

1. **Repeat** the problem in your words.  
2. **Examples** — including edge (empty, one element, duplicates).  
3. **Approach** — pattern name + time/space.  
4. **Confirm** with interviewer.  
5. **Code** — clean names, no magic.  
6. **Test** — walk through your example + one edge.  
7. **Optimize** — only if asked or obvious.

---

## 3. Amazon coding — high-frequency patterns & questions

### Arrays & strings

**Q: Two Sum — approach?**  
HashMap complement: for each `x`, need `target-x`. O(n) time, O(n) space.  
Edge: duplicate values, negative numbers.  
Repo: `TwoSum` (easy).

**Q: Maximum subarray (Kadane)?**  
Track `current` best ending here and `global` max. O(n), O(1).  
Repo: `MaximumSubarray` (medium).

**Q: Product except self without division?**  
Prefix from left, suffix from right (or one pass output array). O(n), O(1) extra if output doesn’t count.  
Repo: `ProductExceptSelf`.

**Q: Trapping rain water?**  
Two pointers from ends with left/right max, or monotonic stack. O(n).  
Repo: `TrappingRainWater` (advanced).

**Q: Merge intervals?**  
Sort by start; merge overlapping. O(n log n).  
Repo: `MergeIntervals`.

**Q: 3Sum?**  
Sort; fix `i`, two-pointer on rest; skip duplicates. O(n²).  
Repo: `ThreeSum`.

### Sliding window

**Q: Longest substring without repeating?**  
Map last index; shrink left when duplicate. O(n).  
Repo: `LongestSubstringWithoutRepeating`.

**Q: Minimum window substring?**  
Expand until valid, shrink while valid, track min. O(n) average.  
Repo: `MinimumWindowSubstring` (advanced).

**Q: Sliding window maximum?**  
Deque storing indices decreasing by value. O(n).  
Repo: `SlidingWindowMaximum` (advanced).

**Q: Subarray sum equals K?**  
Prefix sum + HashMap count of prefix. O(n).  
Repo: `SubarraySumEqualsK`.

### Hashing

**Q: Group anagrams?**  
Key = sorted string or freq[26]. O(n × k log k) or O(n × k).  
Repo: `GroupAnagrams`.

**Q: Top K frequent elements?**  
Count + min-heap size k, or bucket sort. O(n log k).  
Repo: `TopKFrequent`.

### Binary search

**Q: Search rotated sorted array?**  
Which half is sorted; discard other. O(log n).  
Repo: `SearchRotatedSortedArray`.

**Q: Find first bad version?**  
Binary search first true. O(log n).  
Repo: `FirstBadVersion` (easy).

### Linked list

**Q: Detect cycle?**  
Floyd slow/fast. O(n).  
Repo: `LinkedListCycle`.

**Q: Merge k sorted lists?**  
Min-heap of list heads. O(N log k).  
Repo: `MergeKSortedLists` (advanced).

**Q: Reverse linked list in place?**  
prev/curr/next. O(n), O(1).  
Repo: `ReverseLinkedList` (easy) + Phase 1 problem.

### Stack / monotonic

**Q: Valid parentheses?**  
Stack of openers. O(n).  
Repo: `ValidParentheses` (easy).

**Q: Daily temperatures?**  
Monotonic decreasing stack of indices. O(n).  
Repo: `DailyTemperatures`.

**Q: Largest rectangle in histogram?**  
Monotonic stack (classic hard — know idea).  
Not in repo — study if time permits.

### Trees

**Q: Level order traversal?**  
BFS queue. O(n).  
Repo: `BinaryTreeLevelOrder`.

**Q: Validate BST?**  
DFS with min/max bounds. O(n).  
Repo: `ValidateBST`.

**Q: LCA in binary tree (not BST)?**  
Post-order: if both sides return non-null, root is LCA. O(n).  
Repo: `LowestCommonAncestorBinaryTree` (advanced).

**Q: Max path sum in binary tree?**  
Post-order; global max of path through node. O(n).  
Repo: `BinaryTreeMaximumPathSum` (advanced).

**Q: Serialize / deserialize binary tree?**  
BFS or DFS with null markers. O(n).  
Repo: `SerializeDeserializeBinaryTree` (advanced).

### Graphs

**Q: Number of islands?**  
DFS/BFS on grid. O(rows × cols).  
Repo: `NumberOfIslands`.

**Q: Course schedule (cycle)?**  
Topo sort Kahn or DFS colors. O(V+E).  
Repo: `CourseSchedule`.

**Q: Clone graph?**  
BFS/DFS + HashMap old→clone. O(V+E).  
Repo: `CloneGraph` (advanced).

**Q: Word ladder shortest path?**  
BFS on word graph. O(n × wordLen).  
Repo: `WordLadder` (advanced).

**Q: Cheapest flights within K stops?**  
Bellman-Ford style or BFS on (node, stops).  
Repo: `CheapestFlightsWithinKStops` (advanced).

### Dynamic programming

**Q: Coin change minimum coins?**  
DP[amount] = min over coins. O(amount × coins).  
Repo: `CoinChange`.

**Q: Word break?**  
DP[i] = can segment prefix. O(n²).  
Repo: `WordBreak`.

**Q: Decode ways?**  
DP on index; handle "0" invalid. O(n).  
Repo: `DecodeWays` (advanced).

**Q: Longest increasing subsequence?**  
DP O(n²) or patience sorting O(n log n).  
Repo: `LongestIncreasingSubsequence` (advanced).

**Q: Partition equal subset sum?**  
0/1 knapsack DP. O(n × sum).  
Repo: `PartitionEqualSubsetSum` (advanced).

### Backtracking

**Q: Subsets?**  
Include/exclude each element. O(2^n).  
Repo: `Subsets` (advanced).

**Q: Permutations?**  
Swap or used[] array. O(n × n!).  
Repo: `Permutations` (advanced).

**Q: Combination sum?**  
Backtrack with start index (reuse allowed).  
Repo: `CombinationSum` (advanced).

**Q: Word search on board?**  
DFS + mark visited + unmark. O(m×n×4^L).  
Repo: `WordSearch` (advanced).

### Design / heap

**Q: LRU cache?**  
HashMap + doubly linked list OR LinkedHashMap access-order. get/put O(1).  
Repo: `LRUCache` (advanced).

**Q: Implement Trie?**  
Node[26] or HashMap children.  
Repo: `ImplementTrie` (medium).

**Q: Meeting rooms II — min rooms?**  
Sort starts; min-heap of end times. O(n log n).  
Repo: `MeetingRoomsII` (advanced).

---

## 4. Apple coding — what to expect

Apple SDET coding is **variable by team**:

| Signal | Often asked | Prep |
| --- | --- | --- |
| Clean medium | Arrays, strings, trees | Same as Amazon medium core |
| Practical | “Test this function” follow-up | Edge cases, mocks, table-driven tests |
| Less common | Hard DP, graph exotic | Know medium; don’t skip graphs entirely |
| Native teams | Obj-C/Swift possible | Java prep still OK for many QA/SET roles |

**Apple-style follow-ups:**  
- “What edge cases?” → null, empty, single, max int, duplicates.  
- “How would QA approach this feature?” → risk areas, automation pyramid.

---

## 5. Google / Microsoft / Meta (SDET coding snapshot)

| Company | SDET coding note |
| --- | --- |
| **Google** | Strong algorithms; medium–hard possible for SET |
| **Microsoft** | Medium + OOP/design; Azure/DevOps awareness |
| **Meta** | Medium fast; product sense sometimes |

Same **pattern list** as §3 — frequency mix differs.

---

## 6. Follow-up questions interviewers ask

| After your solution | What they want |
| --- | --- |
| “Can you do O(1) space?” | Two pointers, in-place, reuse input |
| “What if input doesn’t fit memory?” | External sort, streaming, map-reduce sketch |
| “What if sorted?” | Binary search, two pointers |
| “Duplicates?” | Skip in 3Sum; sort + compare |
| “Thread-safe?” | Rare in SDET algo — mention synchronized / concurrent structures |
| “Unit test?” | Table: input → expected; boundary cases |

---

## 7. Complexity — must-know answers (rapid)

| Problem type | Time | Space |
| --- | --- | --- |
| Hash one-pass | O(n) | O(n) |
| Sort + scan | O(n log n) | O(1) or O(n) |
| Two pointers | O(n) | O(1) |
| Binary search | O(log n) | O(1) |
| BFS/DFS graph | O(V+E) | O(V) |
| Heap size k | O(n log k) | O(k) |
| DP 1D | O(n) or O(n×m) | O(n) or O(1) optimized |
| Backtracking | exponential | O(depth) stack |

---

## 8. “Tell me about a bug you found” (coding-adjacent SDET)

Structure:

1. **Symptom** — flaky test / prod escape / wrong complexity in prod code.  
2. **Investigation** — logs, bisect, reproduce.  
3. **Root cause** — race, wrong invariant, off-by-one (tie to DSA!).  
4. **Fix** — code + test + guard.  
5. **Prevention** — lint, static analysis, better test data.

---

## 9. Problems **in this repo** by company relevance

### Amazon SDET III — do all of these

**Easy (must):** TwoSum, ValidParentheses, BinarySearch, MergeTwoSortedLists, MaxDepthBinaryTree, NumberOfIslands (easy graph), KthLargest, ClimbingStairs.

**Medium (must):** All 25 in [medium/README.md](medium/README.md).

**Advanced (high value):** LRUCache, MinimumWindowSubstring, MergeKSortedLists, WordLadder, LowestCommonAncestorBinaryTree, TrappingRainWater, Subsets, DecodeWays.

### Apple SDET III — prioritize

Medium: MaximumSubarray, LongestSubstringWithoutRepeating, ValidateBST, NumberOfIslands, MergeIntervals, TopKFrequent.  
Advanced: LCA, SerializeDeserializeBinaryTree (clean OOP).  
Plus quality/framework from revision track.

---

## 10. Problems **not in repo** — study externally if time

Add on LeetCode/NeetCode after finishing repo stubs:

| Problem | Why |
| --- | --- |
| Largest rectangle in histogram | Amazon hard stack |
| Median of two sorted arrays | Hard binary search |
| Regular expression matching | Hard DP |
| Word search II (Trie + backtrack) | Amazon |
| Alien dictionary | Topo sort |
| Serialize N-ary tree | Design variant |

---

## 11. Mock coding prompts (timed 35 min)

1. Given logs of test runs `[pass, fail, fail, pass, …]`, return length of longest stable pass streak after fixing at most one failure. (Custom — window/greedy.)  
2. Merge overlapping intervals with a new interval insert. (MergeIntervals + variant.)  
3. Return k closest strings to target lexicographically. (Heap.)  
4. Design in-memory rate limiter: max N calls per minute. (LLD + queue/map — see system-design LLD.)  
5. Given dependency graph of test suites, return order to run or detect cycle. (CourseSchedule.)

---

## 12. Self-check before scheduling Amazon / Apple

- [ ] 25 medium implemented without looking at solutions  
- [ ] 10 advanced implemented  
- [ ] Can draw approach in 3 min for any medium in §3  
- [ ] State time/space without hesitation  
- [ ] One timed mock per week × 4 weeks  
- [ ] Framework whiteboard separate from coding (see checklist)

---

## 13. Quick pattern → repo map

| Pattern | Easy | Medium | Advanced |
| --- | --- | --- | --- |
| Hash | TwoSum | GroupAnagrams, SubarraySumEqualsK | — |
| Window | MaxSumOfK | LongestSubstring | MinWindow, SlidingWindowMax |
| Two pointers | TwoSumSorted | ContainerWater, ThreeSum | TrappingRainWater |
| Stack | ValidParentheses | DailyTemperatures | — |
| Tree | MaxDepth | ValidateBST, LevelOrder | LCA, MaxPathSum, Serialize |
| Graph | FloodFill | NumberOfIslands, CourseSchedule | CloneGraph, WordLadder |
| DP | ClimbingStairs | CoinChange, WordBreak | DecodeWays, LIS, Partition |
| Backtrack | — | — | Subsets, Permutations, WordSearch |
| Design | MinStack | ImplementTrie | LRUCache |
| Heap | KthLargest | TopKFrequent | MergeKLists, MeetingRoomsII |

Master checklist: [AMAZON-APPLE-SDET3-CHECKLIST.md](../AMAZON-APPLE-SDET3-CHECKLIST.md)
