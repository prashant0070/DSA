# Easy DSA practice

Stubs only — **you write the solutions**. Each `main` is a grader. Replace `throw new UnsupportedOperationException("implement me")` and run until you see `All checks passed.`

You may use `java.util` here (`HashMap`, `HashSet`, `ArrayDeque`, `PriorityQueue`). Phase 1 still asks you to build those structures yourself later.

Helpers (not problems): `Checks.java`, `Node.java`, `TreeNode.java`.

## Compile and run

From this folder:

```bash
javac -d out src/dsa/practice/easy/*.java
java -cp out dsa.practice.easy.MaxElement
```

Change the last name to the class you are working on.

## What this track covers

Every **easy interview pattern** below has at least one problem. Work in order inside each topic; skip around by topic if you prefer.

**Still medium/hard (not in this folder):** variable sliding window, 3Sum / rain water, backtracking (subsets, N-queens), graph islands / topo sort / Dijkstra, tree LCA on a binary tree (not BST), heap “top K frequent”, merge intervals, Implement Trie, Union-Find provinces, coin-change DP, LRU cache.

**Next tracks:** [medium](../medium/README.md) · [advanced](../advanced/README.md) · [CODING-INTERVIEW-QA](../CODING-INTERVIEW-QA.md) · **[Full question list](../CODING-QUESTIONS-INDEX.md)** (every problem as an actual interview question)

## Suggested order

| # | Class | Topic | Logic it covers |
| --- | --- | --- | --- |
| 1 | `MaxElement` | Arrays | Linear scan; track a running best |
| 2 | `ReverseArray` | Arrays | Two pointers from both ends; swap in place |
| 3 | `RunningSum` | Arrays | Prefix sum |
| 4 | `MoveZeroes` | Arrays | Write-index (slow/fast) |
| 5 | `MaxConsecutiveOnes` | Arrays | Running streak |
| 6 | `BestTimeToBuySellStock` | Arrays | Running minimum; profit = price − min |
| 7 | `RemoveDuplicatesSorted` | Arrays | Write-index on a sorted unique prefix |
| 8 | `MergeSortedArray` | Arrays | Merge from the back (two pointers) |
| 9 | `PlusOne` | Arrays | Digit carry |
| 10 | `MajorityElement` | Arrays | Boyer–Moore vote (or HashMap count) |
| 11 | `RotateArray` | Arrays | Three reverses; k %= n |
| 12 | `SquaresOfSortedArray` | Arrays | Two pointers from the ends after square |
| 13 | `TwoSum` | Hashing | Complement map |
| 14 | `ContainsDuplicate` | Hashing | Seen set |
| 15 | `ContainsNearbyDuplicate` | Hashing + window | Last-k values in a set / last-index map |
| 16 | `IsomorphicStrings` | Hashing | Two maps (bijection) |
| 17 | `RansomNote` | Hashing | Frequency cover |
| 18 | `ReverseString` | Strings | Two pointers on `char[]` |
| 19 | `ValidPalindrome` | Strings | Two pointers; skip non-alphanumeric |
| 20 | `ValidAnagram` | Strings + hashing | Frequency count |
| 21 | `FirstUniqueChar` | Strings + hashing | Count, then scan for count 1 |
| 22 | `LongestCommonPrefix` | Strings | Vertical scan |
| 23 | `RomanToInt` | Strings | Map + peek (subtractive notation) |
| 24 | `IndexOfSubstring` | Strings | Fixed window / nested scan (strStr) |
| 25 | `TwoSumSorted` | Two pointers | Sorted two-sum; left/right |
| 26 | `IsSubsequence` | Two pointers | Advance needle only on match |
| 27 | `MaxSumOfK` | Sliding window | Fixed window of length k |
| 28 | `BinarySearch` | Binary search | lo/hi on a sorted array |
| 29 | `SearchInsertPosition` | Binary search | Return insertion index if missing |
| 30 | `SqrtX` | Binary search | Search on the answer; watch overflow |
| 31 | `FirstBadVersion` | Binary search | First true in a boolean predicate |
| 32 | `ValidParentheses` | Stack | Push openers; pop on match |
| 33 | `MinStack` | Stack / design | Extra stack (or pairs) for O(1) min |
| 34 | `NextGreaterElement` | Stack | Monotonic stack |
| 35 | `QueueUsingStacks` | Stack / design | Two stacks; pour to reverse |
| 36 | `ReverseLinkedList` | Linked list | prev / curr / next |
| 37 | `MiddleOfLinkedList` | Linked list | Slow/fast |
| 38 | `MergeTwoSortedLists` | Linked list | Dummy head; pick smaller |
| 39 | `LinkedListCycle` | Linked list | Floyd cycle |
| 40 | `PalindromeLinkedList` | Linked list | Reverse second half, compare |
| 41 | `RemoveDuplicatesFromSortedList` | Linked list | Skip equal neighbors |
| 42 | `RemoveNthFromEnd` | Linked list | Gap of n between two pointers |
| 43 | `IntersectionOfTwoLists` | Linked list | Switch heads to equalize length |
| 44 | `MaxDepthBinaryTree` | Trees | DFS height |
| 45 | `InvertBinaryTree` | Trees | Swap children at every node |
| 46 | `SameTree` | Trees | Recurse both sides |
| 47 | `SymmetricTree` | Trees | Mirror helper |
| 48 | `PathSum` | Trees | Root-to-leaf remaining sum |
| 49 | `DiameterOfBinaryTree` | Trees | Height(left)+height(right), global max |
| 50 | `SortedArrayToBST` | Trees / BST | Mid of range as root |
| 51 | `LowestCommonAncestorBST` | Trees / BST | Walk using ordered property |
| 52 | `FloodFill` | Graphs / matrix | 4-direction DFS/BFS |
| 53 | `PathExistsInGraph` | Graphs | BFS/DFS or Union-Find |
| 54 | `FindTownJudge` | Graphs | In-degree / out-degree |
| 55 | `ClimbingStairs` | DP | Fibonacci recurrence |
| 56 | `MinCostClimbingStairs` | DP | min of take 1 or 2 |
| 57 | `HouseRobber` | DP | Pick vs skip (no two adjacent) |
| 58 | `PascalTriangle` | DP | Row from previous row |
| 59 | `CountingBits` | DP + bits | dp[i] from i>>1 |
| 60 | `LastStoneWeight` | Heaps | Max-heap, smash two heaviest |
| 61 | `KthLargest` | Heaps / design | Min-heap of size k |
| 62 | `SingleNumber` | Bits | XOR all |
| 63 | `NumberOf1Bits` | Bits | n = n & (n-1) |
| 64 | `PowerOfTwo` | Bits | n > 0 && (n & (n-1)) == 0 |
| 65 | `MissingNumber` | Math / bits | Sum formula or XOR |
| 66 | `MatrixDiagonalSum` | Matrix | Two diagonals; skip double center |
| 67 | `TransposeMatrix` | Matrix | result[j][i] = matrix[i][j] |
| 68 | `PalindromeNumber` | Math | Reverse digits (no string) |
| 69 | `HappyNumber` | Math | Digit-square cycle / set |
| 70 | `FizzBuzz` | Math | Modulo; check 15 first |
| 71 | `CountPrimes` | Math | Sieve of Eratosthenes |
| 72 | `AssignCookies` | Greedy | Sort + two pointers |
| 73 | `LemonadeChange` | Greedy | Track 5s and 10s |
| 74 | `SummaryRanges` | Intervals | Collapse consecutive runs |
| 75 | `RangeSumQuery` | Design / prefix | prefix[r+1] - prefix[l] |

## How to use a file

1. Read the `LEARN:` block (topic + logic).
2. Implement only the marked method (or class, for design problems).
3. Run that class. Fix until all checks pass.
4. Then try the next row.

If you get stuck, ask about **that** problem (the logic, not a full paste of a solution you found online).
