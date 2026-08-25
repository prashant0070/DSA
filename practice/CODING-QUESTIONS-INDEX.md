# Coding questions — full detailed index

Every coding stub in this repo as an **actual interview question**, grouped by topic.

**Totals:** Easy **75** · Medium **25** · Advanced **20** · Phase problems **6** → **126**

**Folders:** [easy](easy/README.md) · [medium](medium/README.md) · [advanced](advanced/README.md) · [CODING-INTERVIEW-QA](CODING-INTERVIEW-QA.md)

---

# PART A — EASY (75)

## Topic: Arrays

1. **MaxElement** — Find the maximum value in an integer array.  
   API: `int max(int[] nums)`

2. **ReverseArray** — Reverse an array **in place** (no second array).  
   API: `void reverse(int[] nums)`

3. **RunningSum** — Return a new array where each index `i` is the sum of `nums[0..i]`.  
   API: `int[] runningSum(int[] nums)`

4. **MoveZeroes** — Move all zeros to the end **in place**, keep relative order of non-zeros.  
   API: `void moveZeroes(int[] nums)`

5. **MaxConsecutiveOnes** — Return the maximum number of consecutive `1`s in a binary array.  
   API: `int findMaxConsecutiveOnes(int[] nums)`

6. **BestTimeToBuySellStock** — Prices over days; buy once and sell once later. Return max profit (or 0).  
   API: `int maxProfit(int[] prices)`

7. **RemoveDuplicatesSorted** — Sorted array: remove duplicates **in place**; return new length.  
   API: `int removeDuplicates(int[] nums)`

8. **MergeSortedArray** — Merge two sorted arrays into `nums1` (has extra space for `nums2`).  
   API: `void merge(int[] nums1, int m, int[] nums2, int n)`

9. **PlusOne** — Digits of a number as array; add one; return resulting digits.  
   API: `int[] plusOne(int[] digits)`

10. **MajorityElement** — Find the element that appears more than `n/2` times.  
    API: `int majorityElement(int[] nums)`

11. **RotateArray** — Rotate array right by `k` steps **in place**.  
    API: `void rotate(int[] nums, int k)`

12. **SquaresOfSortedArray** — Sorted array (may have negatives); return squares in sorted order.  
    API: `int[] sortedSquares(int[] nums)`

## Topic: Hashing

13. **TwoSum** — Return indices of two numbers that add to `target` (exactly one solution).  
    API: `int[] twoSum(int[] nums, int target)`

14. **ContainsDuplicate** — Return true if any value appears at least twice.  
    API: `boolean containsDuplicate(int[] nums)`

15. **ContainsNearbyDuplicate** — True if two equal values are at most `k` indices apart.  
    API: `boolean containsNearbyDuplicate(int[] nums, int k)`

16. **IsomorphicStrings** — True if `s` and `t` are isomorphic (1–1 char mapping).  
    API: `boolean isIsomorphic(String s, String t)`

17. **RansomNote** — Can you build `ransomNote` using letters from `magazine` (each letter once)?  
    API: `boolean canConstruct(String ransomNote, String magazine)`

## Topic: Strings

18. **ReverseString** — Reverse a character array **in place**.  
    API: `void reverseString(char[] s)`

19. **ValidPalindrome** — True if string is a palindrome ignoring non-alphanumeric and case.  
    API: `boolean isPalindrome(String s)`

20. **ValidAnagram** — True if `t` is an anagram of `s`.  
    API: `boolean isAnagram(String s, String t)`

21. **FirstUniqueChar** — Index of first non-repeating character; `-1` if none.  
    API: `int firstUniqChar(String s)`

22. **LongestCommonPrefix** — Longest common prefix among an array of strings (or `""`).  
    API: `String longestCommonPrefix(String[] strs)`

23. **RomanToInt** — Convert a Roman numeral string to an integer.  
    API: `int romanToInt(String s)`

24. **IndexOfSubstring** — Index of first occurrence of `needle` in `haystack` (`strStr`); `-1` if missing.  
    API: `int strStr(String haystack, String needle)`

## Topic: Two pointers

25. **TwoSumSorted** — Sorted array: return 1-based indices of two numbers that sum to `target`.  
    API: `int[] twoSum(int[] numbers, int target)`

26. **IsSubsequence** — True if `s` is a subsequence of `t`.  
    API: `boolean isSubsequence(String s, String t)`

## Topic: Sliding window (fixed)

27. **MaxSumOfK** — Maximum sum of any contiguous subarray of length `k`.  
    API: `int maxSum(int[] nums, int k)`

## Topic: Binary search

28. **BinarySearch** — Index of `target` in a sorted array; `-1` if not found.  
    API: `int search(int[] nums, int target)`

29. **SearchInsertPosition** — Index where `target` is found, or where it should be inserted.  
    API: `int searchInsert(int[] nums, int target)`

30. **SqrtX** — Integer square root of `x` (floor).  
    API: `int mySqrt(int x)`

31. **FirstBadVersion** — Versions `1..n`; first bad version (API `isBadVersion`).  
    API: `int firstBadVersion(int n)`

## Topic: Stack / design

32. **ValidParentheses** — True if brackets `()[]{}` are correctly matched and nested.  
    API: `boolean isValid(String s)`

33. **MinStack** — Stack supporting `push`, `pop`, `top`, and `getMin` in O(1).  
    API: `MinStack` / `push` / `pop` / `top` / `getMin`

34. **NextGreaterElement** — For each num in `nums1`, next greater in `nums2` (or `-1`).  
    API: `int[] nextGreaterElement(int[] nums1, int[] nums2)`

35. **QueueUsingStacks** — Implement a queue using only stacks (`push`/`pop`/`peek`/`empty`).  
    API: `MyQueue`

## Topic: Linked list

36. **ReverseLinkedList** — Reverse a singly linked list; return new head.  
    API: `Node reverseList(Node head)`

37. **MiddleOfLinkedList** — Return the middle node (if even length, second middle).  
    API: `Node middleNode(Node head)`

38. **MergeTwoSortedLists** — Merge two sorted linked lists into one sorted list.  
    API: `Node mergeTwoLists(Node l1, Node l2)`

39. **LinkedListCycle** — True if the list has a cycle.  
    API: `boolean hasCycle(Node head)`

40. **PalindromeLinkedList** — True if the linked list is a palindrome.  
    API: `boolean isPalindrome(Node head)`

41. **RemoveDuplicatesFromSortedList** — Delete duplicates from a sorted list so each value appears once.  
    API: `Node deleteDuplicates(Node head)`

42. **RemoveNthFromEnd** — Remove the nth node from the end; return head.  
    API: `Node removeNthFromEnd(Node head, int n)`

43. **IntersectionOfTwoLists** — Return the intersection node of two lists (by reference), or null.  
    API: `Node getIntersectionNode(Node a, Node b)`

## Topic: Trees / BST

44. **MaxDepthBinaryTree** — Maximum depth of a binary tree.  
    API: `int maxDepth(TreeNode root)`

45. **InvertBinaryTree** — Invert (mirror) a binary tree; return root.  
    API: `TreeNode invert(TreeNode root)`

46. **SameTree** — True if two trees are structurally identical with same values.  
    API: `boolean isSameTree(TreeNode p, TreeNode q)`

47. **SymmetricTree** — True if tree is a mirror of itself.  
    API: `boolean isSymmetric(TreeNode root)`

48. **PathSum** — True if a root-to-leaf path sums to `targetSum`.  
    API: `boolean hasPathSum(TreeNode root, int targetSum)`

49. **DiameterOfBinaryTree** — Length of the longest path between any two nodes (edges).  
    API: `int diameter(TreeNode root)`

50. **SortedArrayToBST** — Convert sorted array to a height-balanced BST.  
    API: `TreeNode sortedArrayToBST(int[] nums)`

51. **LowestCommonAncestorBST** — LCA of nodes `p` and `q` in a BST.  
    API: `TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q)`

## Topic: Graphs / matrix

52. **FloodFill** — Flood-fill image starting at `(sr,sc)` with `color` (4-directional).  
    API: `int[][] floodFill(int[][] image, int sr, int sc, int color)`

53. **PathExistsInGraph** — True if there is a path from `source` to `destination` in an undirected graph.  
    API: `boolean validPath(int n, int[][] edges, int source, int destination)`

54. **FindTownJudge** — Find the town judge (trusted by all, trusts nobody); `-1` if none.  
    API: `int findJudge(int n, int[][] trust)`

## Topic: Dynamic programming

55. **ClimbingStairs** — Ways to climb `n` stairs taking 1 or 2 steps.  
    API: `int climbStairs(int n)`

56. **MinCostClimbingStairs** — Min cost to reach top; can start at step 0 or 1.  
    API: `int minCostClimbingStairs(int[] cost)`

57. **HouseRobber** — Max money without robbing two adjacent houses.  
    API: `int rob(int[] nums)`

58. **PascalTriangle** — Generate first `numRows` of Pascal’s triangle.  
    API: `List<List<Integer>> generate(int numRows)`

59. **CountingBits** — For `0..n`, return array of number of 1-bits in each number.  
    API: `int[] countBits(int n)`

## Topic: Heaps

60. **LastStoneWeight** — Smash heaviest two stones repeatedly; return last stone weight (or 0).  
    API: `int lastStoneWeight(int[] stones)`

61. **KthLargest** — Design class: stream of numbers, return kth largest after each `add`.  
    API: `KthLargest(int k, int[] nums)` / `int add(int val)`

## Topic: Bits / math

62. **SingleNumber** — Every element appears twice except one; find that one (XOR).  
    API: `int singleNumber(int[] nums)`

63. **NumberOf1Bits** — Count set bits in an unsigned integer.  
    API: `int hammingWeight(int n)`

64. **PowerOfTwo** — True if `n` is a power of two.  
    API: `boolean isPowerOfTwo(int n)`

65. **MissingNumber** — Array contains `n` distinct numbers from `0..n`; find the missing one.  
    API: `int missingNumber(int[] nums)`

66. **MatrixDiagonalSum** — Sum of primary + secondary diagonals (don’t double-count center).  
    API: `int diagonalSum(int[][] mat)`

67. **TransposeMatrix** — Return the transpose of a matrix.  
    API: `int[][] transpose(int[][] matrix)`

68. **PalindromeNumber** — True if integer is a palindrome (without converting to string preferred).  
    API: `boolean isPalindrome(int x)`

69. **HappyNumber** — True if repeated sum of squares of digits reaches 1 (happy number).  
    API: `boolean isHappy(int n)`

70. **FizzBuzz** — Return list `"1".."n"` with Fizz/Buzz/FizzBuzz rules.  
    API: `List<String> fizzBuzz(int n)`

71. **CountPrimes** — Count primes strictly less than `n` (Sieve).  
    API: `int countPrimes(int n)`

## Topic: Greedy / intervals / design

72. **AssignCookies** — Max children content given greed factors `g` and cookie sizes `s`.  
    API: `int findContentChildren(int[] g, int[] s)`

73. **LemonadeChange** — Customers pay with 5/10/20; return true if you can always give change.  
    API: `boolean lemonadeChange(int[] bills)`

74. **SummaryRanges** — Sorted unique ints → list of range strings like `"1->3"`, `"5"`.  
    API: `List<String> summaryRanges(int[] nums)`

75. **RangeSumQuery** — Class: preprocess array; answer `sumRange(left, right)` many times.  
    API: `NumArray(int[] nums)` / `int sumRange(int left, int right)`

---

# PART B — MEDIUM (25)

## Arrays / prefix / window / hash

1. **MaximumSubarray** — Maximum sum of any contiguous subarray (Kadane).  
   API: `int maxSubArray(int[] nums)`

2. **ProductExceptSelf** — For each index, product of all other elements (**no division**).  
   API: `int[] productExceptSelf(int[] nums)`

3. **LongestSubstringWithoutRepeating** — Length of longest substring with all unique characters.  
   API: `int lengthOfLongestSubstring(String s)`

4. **GroupAnagrams** — Group anagrams together from a list of strings.  
   API: `List<List<String>> groupAnagrams(String[] strs)`

5. **SubarraySumEqualsK** — Number of contiguous subarrays whose sum equals `k`.  
   API: `int subarraySum(int[] nums, int k)`

## Two pointers / sorting

6. **ThreeSum** — All unique triplets that sum to 0.  
   API: `List<List<Integer>> threeSum(int[] nums)`

7. **ContainerWithMostWater** — Two lines form a container; max water area.  
   API: `int maxArea(int[] height)`

8. **SortColors** — Sort array of 0/1/2 **in place** (Dutch national flag).  
   API: `void sortColors(int[] nums)`

## Binary search / intervals

9. **SearchRotatedSortedArray** — Search `target` in a rotated sorted array (O(log n)).  
   API: `int search(int[] nums, int target)`

10. **MergeIntervals** — Merge all overlapping intervals.  
    API: `int[][] merge(int[][] intervals)`

## Graphs / trees / linked list

11. **NumberOfIslands** — Count islands of `1`s in a grid (4-connected).  
    API: `int numIslands(char[][] grid)`

12. **BinaryTreeLevelOrder** — Level-order (BFS) traversal as list of levels.  
    API: `List<List<Integer>> levelOrder(TreeNode root)`

13. **ValidateBST** — True if binary tree is a valid BST.  
    API: `boolean isValidBST(TreeNode root)`

14. **AddTwoNumbers** — Two numbers as reversed linked lists; return sum as list.  
    API: `Node addTwoNumbers(Node l1, Node l2)`

## Heap / stack / DP / greedy / matrix / trie

15. **TopKFrequent** — Return the `k` most frequent elements.  
    API: `int[] topKFrequent(int[] nums, int k)`

16. **DailyTemperatures** — For each day, days until a warmer temperature (or 0).  
    API: `int[] dailyTemperatures(int[] temperatures)`

17. **CoinChange** — Fewest coins to make `amount` (or `-1`).  
    API: `int coinChange(int[] coins, int amount)`

18. **WordBreak** — True if `s` can be segmented into dictionary words.  
    API: `boolean wordBreak(String s, String[] wordDict)`

19. **UniquePaths** — Robot from top-left to bottom-right of `m x n` grid; only right/down.  
    API: `int uniquePaths(int m, int n)`

20. **JumpGame** — True if you can reach the last index (jumps of size ≤ `nums[i]`).  
    API: `boolean canJump(int[] nums)`

21. **LongestPalindromicSubstring** — Longest palindromic substring in `s`.  
    API: `String longestPalindrome(String s)`

22. **KClosestPointsToOrigin** — `k` points closest to origin.  
    API: `int[][] kClosest(int[][] points, int k)`

23. **CourseSchedule** — True if you can finish all courses given prerequisites (no cycle).  
    API: `boolean canFinish(int numCourses, int[][] prerequisites)`

24. **RotateImage** — Rotate `n x n` matrix 90° clockwise **in place**.  
    API: `void rotate(int[][] matrix)`

25. **ImplementTrie** — Trie with `insert`, `search`, `startsWith`.  
    API: `Trie` / `insert` / `search` / `startsWith`

---

# PART C — ADVANCED (20) — SDET III / Amazon bar

## Design / window / heap

1. **LRUCache** — Design LRU cache: `get`/`put` in O(1); evict least recently used.  
   API: `LRUCache(int capacity)` / `get` / `put`

2. **TrappingRainWater** — Elevation map; how much rainwater can be trapped.  
   API: `int trap(int[] height)`

3. **SlidingWindowMaximum** — Max of each sliding window of size `k`.  
   API: `int[] maxSlidingWindow(int[] nums, int k)`

4. **MinimumWindowSubstring** — Smallest substring of `s` that covers all characters of `t`.  
   API: `String minWindow(String s, String t)`

5. **MergeKSortedLists** — Merge `k` sorted linked lists into one sorted list.  
   API: `Node mergeKLists(Node[] lists)`

## Backtracking

6. **Subsets** — All subsets of a distinct-integer array (power set).  
   API: `List<List<Integer>> subsets(int[] nums)`

7. **Permutations** — All permutations of a distinct-integer array.  
   API: `List<List<Integer>> permute(int[] nums)`

8. **CombinationSum** — Combinations from `candidates` that sum to `target` (reuse allowed).  
   API: `List<List<Integer>> combinationSum(int[] candidates, int target)`

9. **WordSearch** — True if `word` exists in a 2D board via adjacent letters (no reuse of cell).  
   API: `boolean exist(char[][] board, String word)`

## Trees

10. **SerializeDeserializeBinaryTree** — Serialize a binary tree to string and deserialize back.  
    API: `String serialize(TreeNode root)` / `TreeNode deserialize(String data)`

11. **LowestCommonAncestorBinaryTree** — LCA of `p` and `q` in a **binary tree** (not BST).  
    API: `TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q)`

12. **BinaryTreeMaximumPathSum** — Maximum path sum anywhere in a binary tree (any node to any node).  
    API: `int maxPathSum(TreeNode root)`

## Graphs

13. **CloneGraph** — Deep clone an undirected connected graph.  
    API: `GraphNode cloneGraph(GraphNode node)`

14. **WordLadder** — Shortest transformation length from `beginWord` to `endWord` (change one letter; must be in word list).  
    API: `int ladderLength(String beginWord, String endWord, List<String> wordList)`

15. **PacificAtlanticWaterFlow** — Cells from which water can flow to both Pacific and Atlantic.  
    API: `List<List<Integer>> pacificAtlantic(int[][] heights)`

## Intervals / DP / graph DP

16. **MeetingRoomsII** — Min number of meeting rooms required for intervals.  
    API: `int minMeetingRooms(int[][] intervals)`

17. **LongestIncreasingSubsequence** — Length of longest strictly increasing subsequence.  
    API: `int lengthOfLIS(int[] nums)`

18. **PartitionEqualSubsetSum** — True if array can be partitioned into two subsets with equal sum.  
    API: `boolean canPartition(int[] nums)`

19. **DecodeWays** — Number of ways to decode a digit string (`A=1` … `Z=26`).  
    API: `int numDecodings(String s)`

20. **CheapestFlightsWithinKStops** — Cheapest price from `src` to `dst` with at most `k` stops (`-1` if impossible).  
    API: `int findCheapestPrice(int n, int[][] flights, int src, int dst, int k)`

---

# PART D — Phase problems (build structures)

## Phase 0 — OOP

1. **Temperature** — Model a temperature with absolute-zero invariant; convert C/F safely.  
2. **TotalPay** — Compute total pay from hours/rate with overtime rules (encapsulation).  
3. **PointEquals** — Implement `equals` + `hashCode` for a 2D Point value object (map contract).

## Phase 1 — Linear structures

1. **ValidParenthesesWithStack** — Validate parentheses using **your** Stack implementation.  
2. **ReverseLinkedListInPlace** — Reverse a linked list **in place** using your list type.  
3. **QueueWithTwoStacks** — Implement a queue using two stacks (amortized O(1)).

---

# PART E — Topics map (what each topic means)

| Topic | What you practice |
| --- | --- |
| Arrays | Scan, in-place edits, prefix, rotate |
| Hashing | Maps/sets for lookup, frequency, bijection |
| Strings | Palindrome, anagram, prefix, search |
| Two pointers | Sorted pair, subsequence, container |
| Sliding window | Fixed/variable window max/unique/cover |
| Binary search | Sorted search, answer-space search |
| Stack | Matching, monotonic, min-stack, queue |
| Linked list | Reverse, cycle, merge, nth-from-end |
| Trees / BST | DFS/BFS, validate, LCA, path sum |
| Graphs | BFS/DFS, islands, topo, clone, ladder |
| Heap | Top-K, merge K lists, meeting rooms |
| DP | 1D/2D, knapsack-style, decode, LIS |
| Backtracking | Subsets, permutations, combinations, word search |
| Greedy | Jump game, cookies, lemonade |
| Intervals | Merge, summary ranges, meeting rooms |
| Design | LRU, Trie, MinStack, RangeSum, KthLargest |
| Bits / Math | XOR, primes, palindrome number |
| Matrix | Rotate, transpose, diagonals, flood fill |

---

# Still outside this repo (optional LeetCode extras)

- Largest rectangle in histogram  
- Median of two sorted arrays  
- Regular expression matching  
- Word search II (Trie + backtrack)  
- Alien dictionary (topo sort)

---

**Open this file anytime:** `practice/CODING-QUESTIONS-INDEX.md`  
**Study order:** Easy by topic → Medium → Advanced → Phase 1 problems.
