/* Academy problem bank. Each Java starter is a complete Main with tests. */
(function (global) {
  'use strict';

  var JAVA_HARNESS =
    '  interface Case { boolean run() throws Exception; }\n' +
    '  static int run(String name, Case c) {\n' +
    '    try {\n' +
    '      boolean ok = c.run();\n' +
    '      System.out.println((ok ? "PASS " : "FAIL ") + name);\n' +
    '      return ok ? 0 : 1;\n' +
    '    } catch (Throwable t) {\n' +
    '      System.out.println("FAIL " + name);\n' +
    '      return 1;\n' +
    '    }\n' +
    '  }\n' +
    '  static boolean eq(int[] a, int[] b) { return Arrays.equals(a, b); }\n' +
    '  static boolean eq(int[][] a, int[][] b) { return Arrays.deepEquals(a, b); }\n';

  function javaStarter(body, extras) {
    return (
      'import java.util.*;\n' +
      'public class Main {\n' +
      (extras || '') +
      body +
      JAVA_HARNESS +
      '}\n'
    );
  }

  function doneLine() {
    return '    System.out.println(failed == 0 ? "All checks passed." : failed + " failed.");\n';
  }

  function jsFn(name, args, body) {
    return 'function ' + name + '(' + args + ') {\n  // implement\n' + (body || "  throw new Error('implement');\n") + '}\n';
  }

  var list = [];

  list.push({
    id: 'max-element',
    title: 'Max Element',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'linear-scan',
    fn: 'max',
    prompt: 'Given a non-empty integer array nums, return the largest value. Walk the array once and keep a running maximum — do not sort. Interviewers want O(n) time and O(1) extra space. nums is never empty.',
    signature: 'int max(int[] nums)',
    viz: null,
    defaultInput: '3,1,9,2',
    solution: 'function max(nums) {\n  let m = nums[0];\n  for (let i = 1; i < nums.length; i++) if (nums[i] > m) m = nums[i];\n  return m;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int max(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("single", () -> max(new int[] {7}) == 7);\n' +
          '    failed += run("mixed", () -> max(new int[] {3, 1, 9, 2}) == 9);\n' +
          '    failed += run("negatives", () -> max(new int[] {-5, -1, -8}) == -1);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('max', 'nums') }
    },
    tests: [
      { name: 'single', args: [[7]], expect: 7, check: 'number' },
      { name: 'mixed', args: [[3, 1, 9, 2]], expect: 9, check: 'number' },
      { name: 'negatives', args: [[-5, -1, -8]], expect: -1, check: 'number' }
    ]
  });

  list.push({
    id: 'reverse-array',
    title: 'Reverse Array',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'two-pointers',
    fn: 'reverse',
    prompt: 'Reverse nums in place. Use two pointers at the ends, swap, and walk inward. Do not allocate a second array. Empty and single-element arrays are already reversed.',
    signature: 'void reverse(int[] nums)',
    viz: 'reverse-array',
    defaultInput: '1,2,3,4,5',
    solution: 'function reverse(nums) {\n  let l = 0, r = nums.length - 1;\n  while (l < r) {\n    const t = nums[l]; nums[l] = nums[r]; nums[r] = t;\n    l++; r--;\n  }\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static void reverse(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("even", () -> { int[] a = {1, 2, 3, 4}; reverse(a); return eq(a, new int[] {4, 3, 2, 1}); });\n' +
          '    failed += run("odd", () -> { int[] a = {1, 2, 3}; reverse(a); return eq(a, new int[] {3, 2, 1}); });\n' +
          '    failed += run("one", () -> { int[] a = {5}; reverse(a); return eq(a, new int[] {5}); });\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('reverse', 'nums') }
    },
    tests: [
      { name: 'even', args: [[1, 2, 3, 4]], expect: [4, 3, 2, 1], check: 'inPlaceArray' },
      { name: 'odd', args: [[1, 2, 3]], expect: [3, 2, 1], check: 'inPlaceArray' },
      { name: 'one', args: [[5]], expect: [5], check: 'inPlaceArray' }
    ]
  });

  list.push({
    id: 'running-sum',
    title: 'Running Sum',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'prefix-sum',
    fn: 'runningSum',
    prompt: 'Return a new array where out[i] is the sum of nums[0]..nums[i]. Keep a running total so you do not re-sum from the start each time. Do not modify nums. This is the classic prefix-sum warmup.',
    signature: 'int[] runningSum(int[] nums)',
    viz: null,
    defaultInput: '1,2,3,4',
    solution: 'function runningSum(nums) {\n  const out = [];\n  let s = 0;\n  for (const x of nums) { s += x; out.push(s); }\n  return out;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int[] runningSum(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("basic", () -> eq(runningSum(new int[] {1, 2, 3, 4}), new int[] {1, 3, 6, 10}));\n' +
          '    failed += run("single", () -> eq(runningSum(new int[] {5}), new int[] {5}));\n' +
          '    failed += run("with zero", () -> eq(runningSum(new int[] {1, 0, 1}), new int[] {1, 1, 2}));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('runningSum', 'nums') }
    },
    tests: [
      { name: 'basic', args: [[1, 2, 3, 4]], expect: [1, 3, 6, 10], check: 'deepEqual' },
      { name: 'single', args: [[5]], expect: [5], check: 'deepEqual' },
      { name: 'with zero', args: [[1, 0, 1]], expect: [1, 1, 2], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'move-zeroes',
    title: 'Move Zeroes',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'two-pointers',
    fn: 'moveZeroes',
    prompt: 'Move all zeroes in nums to the end while preserving the relative order of non-zero values. Modify the array in place. The write-index pattern: scan with a fast pointer, write each non-zero at slow, then fill the tail with zeroes.',
    signature: 'void moveZeroes(int[] nums)',
    viz: 'move-zeroes',
    defaultInput: '0,1,0,3,12',
    solution: 'function moveZeroes(nums) {\n  let s = 0;\n  for (let f = 0; f < nums.length; f++) if (nums[f] !== 0) nums[s++] = nums[f];\n  while (s < nums.length) nums[s++] = 0;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static void moveZeroes(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("mixed", () -> { int[] a = {0, 1, 0, 3, 12}; moveZeroes(a); return eq(a, new int[] {1, 3, 12, 0, 0}); });\n' +
          '    failed += run("no zeros", () -> { int[] a = {1, 2}; moveZeroes(a); return eq(a, new int[] {1, 2}); });\n' +
          '    failed += run("all zeros", () -> { int[] a = {0, 0}; moveZeroes(a); return eq(a, new int[] {0, 0}); });\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('moveZeroes', 'nums') }
    },
    tests: [
      { name: 'mixed', args: [[0, 1, 0, 3, 12]], expect: [1, 3, 12, 0, 0], check: 'inPlaceArray' },
      { name: 'no zeros', args: [[1, 2]], expect: [1, 2], check: 'inPlaceArray' },
      { name: 'all zeros', args: [[0, 0]], expect: [0, 0], check: 'inPlaceArray' }
    ]
  });

  list.push({
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'hash-map',
    fn: 'twoSum',
    prompt: 'Return the indices of two numbers that add up to target. Exactly one solution exists; you may not reuse the same index. Prefer a HashMap of value → index in one pass: for each x, look up target - x. Nested loops work but are O(n²). Indices may be returned in either order.',
    signature: 'int[] twoSum(int[] nums, int target)',
    viz: 'two-sum',
    defaultInput: '2,7,11,15 | 9',
    solution: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const j = seen.get(target - nums[i]);\n    if (j !== undefined) return [j, i];\n    seen.set(nums[i], i);\n  }\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int[] twoSum(int[] nums, int target) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  static boolean solves(int[] nums, int target) {\n' +
          '    int[] idx = twoSum(nums, target);\n' +
          '    if (idx == null || idx.length != 2) return false;\n' +
          '    int i = idx[0], j = idx[1];\n' +
          '    if (i == j || i < 0 || j < 0 || i >= nums.length || j >= nums.length) return false;\n' +
          '    return nums[i] + nums[j] == target;\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("example", () -> solves(new int[] {2, 7, 11, 15}, 9));\n' +
          '    failed += run("later pair", () -> solves(new int[] {3, 2, 4}, 6));\n' +
          '    failed += run("duplicates", () -> solves(new int[] {3, 3}, 6));\n' +
          doneLine() +
          '  }\n'
        ),
        wrapperNote: 'Java main already checks that the two indices sum to target (order-independent).'
      },
      javascript: { starter: jsFn('twoSum', 'nums, target') }
    },
    tests: [
      { name: 'example', args: [[2, 7, 11, 15], 9], expect: [0, 1], check: 'twoSumIndices' },
      { name: 'later pair', args: [[3, 2, 4], 6], expect: [1, 2], check: 'twoSumIndices' },
      { name: 'duplicates', args: [[3, 3], 6], expect: [0, 1], check: 'twoSumIndices' }
    ]
  });

  list.push({
    id: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'easy',
    topic: 'Hashing',
    pattern: 'hash-set',
    fn: 'containsDuplicate',
    prompt: 'Return true if any value appears at least twice in nums, otherwise false. A HashSet of seen values is the expected O(n) solution. Sorting also works if you then scan adjacent pairs.',
    signature: 'boolean containsDuplicate(int[] nums)',
    viz: 'hash-freq',
    defaultInput: '1,2,3,1',
    solution: 'function containsDuplicate(nums) {\n  const seen = new Set();\n  for (const x of nums) {\n    if (seen.has(x)) return true;\n    seen.add(x);\n  }\n  return false;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static boolean containsDuplicate(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("has dup", () -> containsDuplicate(new int[] {1, 2, 3, 1}));\n' +
          '    failed += run("unique", () -> !containsDuplicate(new int[] {1, 2, 3, 4}));\n' +
          '    failed += run("all same", () -> containsDuplicate(new int[] {7, 7}));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('containsDuplicate', 'nums') }
    },
    tests: [
      { name: 'has dup', args: [[1, 2, 3, 1]], expect: true, check: 'boolean' },
      { name: 'unique', args: [[1, 2, 3, 4]], expect: false, check: 'boolean' },
      { name: 'all same', args: [[7, 7]], expect: true, check: 'boolean' }
    ]
  });

  list.push({
    id: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'easy',
    topic: 'Strings',
    pattern: 'hash-freq',
    fn: 'isAnagram',
    prompt: 'Return true if string b is an anagram of a: same characters with the same frequencies, any order. Lowercase English letters only. Count letters of a and subtract letters of b; lengths must match. Sorting both strings is an acceptable alternative.',
    signature: 'boolean isAnagram(String a, String b)',
    viz: 'hash-freq',
    defaultInput: 'anagram nagaram',
    solution: 'function isAnagram(a, b) {\n  if (a.length !== b.length) return false;\n  const c = Array(26).fill(0);\n  for (let i = 0; i < a.length; i++) {\n    c[a.charCodeAt(i) - 97]++;\n    c[b.charCodeAt(i) - 97]--;\n  }\n  return c.every(x => x === 0);\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static boolean isAnagram(String a, String b) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("yes", () -> isAnagram("anagram", "nagaram"));\n' +
          '    failed += run("no", () -> !isAnagram("rat", "car"));\n' +
          '    failed += run("length", () -> !isAnagram("ab", "a"));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('isAnagram', 'a, b') }
    },
    tests: [
      { name: 'yes', args: ['anagram', 'nagaram'], expect: true, check: 'boolean' },
      { name: 'no', args: ['rat', 'car'], expect: false, check: 'boolean' },
      { name: 'length', args: ['ab', 'a'], expect: false, check: 'boolean' }
    ]
  });

  list.push({
    id: 'first-unique-char',
    title: 'First Unique Character',
    difficulty: 'easy',
    topic: 'Strings',
    pattern: 'hash-freq',
    fn: 'firstUniqChar',
    prompt: 'Return the index of the first character that appears exactly once in s. If every character repeats, return -1. Lowercase English letters. Count frequencies, then scan left to right for count == 1. Index is 0-based.',
    signature: 'int firstUniqChar(String s)',
    viz: 'hash-freq',
    defaultInput: 'loveleetcode',
    solution: 'function firstUniqChar(s) {\n  const c = Object.create(null);\n  for (const ch of s) c[ch] = (c[ch] || 0) + 1;\n  for (let i = 0; i < s.length; i++) if (c[s[i]] === 1) return i;\n  return -1;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int firstUniqChar(String s) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("leetcode", () -> firstUniqChar("leetcode") == 0);\n' +
          '    failed += run("loveleetcode", () -> firstUniqChar("loveleetcode") == 2);\n' +
          '    failed += run("aabb", () -> firstUniqChar("aabb") == -1);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('firstUniqChar', 's') }
    },
    tests: [
      { name: 'leetcode', args: ['leetcode'], expect: 0, check: 'number' },
      { name: 'loveleetcode', args: ['loveleetcode'], expect: 2, check: 'number' },
      { name: 'aabb', args: ['aabb'], expect: -1, check: 'number' }
    ]
  });

  list.push({
    id: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'easy',
    topic: 'Strings',
    pattern: 'two-pointers',
    fn: 'isPalindrome',
    prompt: 'Return true if s is a palindrome after ignoring non-alphanumeric characters and case. Two pointers: skip junk, compare letters/digits. Empty and punctuation-only strings count as palindromes. Do not reverse-allocate unless you must; interviewers like the in-place scan.',
    signature: 'boolean isPalindrome(String s)',
    viz: null,
    defaultInput: 'A man, a plan, a canal: Panama',
    solution: 'function isPalindrome(s) {\n  let l = 0, r = s.length - 1;\n  const ok = ch => /[a-z0-9]/i.test(ch);\n  while (l < r) {\n    while (l < r && !ok(s[l])) l++;\n    while (l < r && !ok(s[r])) r--;\n    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;\n    l++; r--;\n  }\n  return true;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static boolean isPalindrome(String s) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("phrase", () -> isPalindrome("A man, a plan, a canal: Panama"));\n' +
          '    failed += run("not", () -> !isPalindrome("race a car"));\n' +
          '    failed += run("spaces", () -> isPalindrome(" "));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('isPalindrome', 's') }
    },
    tests: [
      { name: 'phrase', args: ['A man, a plan, a canal: Panama'], expect: true, check: 'boolean' },
      { name: 'not', args: ['race a car'], expect: false, check: 'boolean' },
      { name: 'spaces', args: [' '], expect: true, check: 'boolean' }
    ]
  });

  list.push({
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    topic: 'Stack',
    pattern: 'matching-pairs',
    fn: 'isValid',
    prompt: 'Given a string of brackets ()[]{}, return true if it is valid. Every opener must close in the correct order. Walk left to right: push openers; on a closer, the stack top must match. The stack must be empty at the end. Extra closer or wrong type is false.',
    signature: 'boolean isValid(String s)',
    viz: 'stack-parens',
    defaultInput: '()[]{}',
    solution: 'function isValid(s) {\n  const st = [];\n  const m = { ")": "(", "]": "[", "}": "{" };\n  for (const ch of s) {\n    if (!m[ch]) st.push(ch);\n    else if (st.pop() !== m[ch]) return false;\n  }\n  return st.length === 0;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static boolean isValid(String s) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("simple", () -> isValid("()"));\n' +
          '    failed += run("mixed", () -> isValid("()[]{}"));\n' +
          '    failed += run("wrong pair", () -> !isValid("(]"));\n' +
          '    failed += run("nested", () -> isValid("{[]}"));\n' +
          '    failed += run("extra close", () -> !isValid("([)]"));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('isValid', 's') }
    },
    tests: [
      { name: 'simple', args: ['()'], expect: true, check: 'boolean' },
      { name: 'mixed', args: ['()[]{}'], expect: true, check: 'boolean' },
      { name: 'wrong pair', args: ['(]'], expect: false, check: 'boolean' },
      { name: 'nested', args: ['{[]}'], expect: true, check: 'boolean' }
    ]
  });

  list.push({
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'easy',
    topic: 'Binary Search',
    pattern: 'binary-search',
    fn: 'search',
    prompt: 'nums is sorted in ascending order. Return the index of target, or -1 if it is missing. You must use binary search: lo/hi, mid = lo + (hi-lo)/2, then shrink the range. A linear scan will be treated as incorrect in an interview even if tests pass on tiny arrays.',
    signature: 'int search(int[] nums, int target)',
    viz: 'binary-search',
    defaultInput: '-1,0,3,5,9,12 | 9',
    solution: 'function search(nums, target) {\n  let lo = 0, hi = nums.length - 1;\n  while (lo <= hi) {\n    const mid = lo + ((hi - lo) >> 1);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int search(int[] nums, int target) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("found", () -> search(new int[] {-1, 0, 3, 5, 9, 12}, 9) == 4);\n' +
          '    failed += run("missing", () -> search(new int[] {-1, 0, 3, 5, 9, 12}, 2) == -1);\n' +
          '    failed += run("one", () -> search(new int[] {5}, 5) == 0);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('search', 'nums, target') }
    },
    tests: [
      { name: 'found', args: [[-1, 0, 3, 5, 9, 12], 9], expect: 4, check: 'number' },
      { name: 'missing', args: [[-1, 0, 3, 5, 9, 12], 2], expect: -1, check: 'number' },
      { name: 'one', args: [[5], 5], expect: 0, check: 'number' }
    ]
  });

  list.push({
    id: 'max-sum-of-k',
    title: 'Max Sum of Subarray of Size K',
    difficulty: 'easy',
    topic: 'Sliding Window',
    pattern: 'fixed-window',
    fn: 'maxSum',
    prompt: 'Find the maximum sum of any contiguous subarray of length k. Sum the first k elements, then slide: add nums[i], drop nums[i-k], track the max. O(n), not O(n*k). k is at least 1 and at most nums.length.',
    signature: 'int maxSum(int[] nums, int k)',
    viz: 'sliding-window',
    defaultInput: '1,4,2,10,23,3,1,0,20 | 4',
    solution: 'function maxSum(nums, k) {\n  let s = 0;\n  for (let i = 0; i < k; i++) s += nums[i];\n  let best = s;\n  for (let i = k; i < nums.length; i++) {\n    s += nums[i] - nums[i - k];\n    if (s > best) best = s;\n  }\n  return best;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int maxSum(int[] nums, int k) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("k=4", () -> maxSum(new int[] {1, 4, 2, 10, 23, 3, 1, 0, 20}, 4) == 39);\n' +
          '    failed += run("k=1", () -> maxSum(new int[] {5, 1, 9}, 1) == 9);\n' +
          '    failed += run("whole", () -> maxSum(new int[] {2, 3}, 2) == 5);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('maxSum', 'nums, k') }
    },
    tests: [
      { name: 'k=4', args: [[1, 4, 2, 10, 23, 3, 1, 0, 20], 4], expect: 39, check: 'number' },
      { name: 'k=1', args: [[5, 1, 9], 1], expect: 9, check: 'number' },
      { name: 'whole', args: [[2, 3], 2], expect: 5, check: 'number' }
    ]
  });

  list.push({
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'easy',
    topic: 'Linked List',
    pattern: 'pointer-reversal',
    fn: 'reverseList',
    prompt: 'Reverse a singly linked list and return the new head. Three pointers: prev, curr, next. Save curr.next, point curr.next at prev, then slide. JS tests pass an array that the runner converts to {val, next} nodes; return the reversed list (runner converts back). Empty list returns null.',
    signature: 'ListNode reverseList(ListNode head)',
    viz: 'linked-list-reverse',
    defaultInput: '1,2,3,4,5',
    solution: 'function reverseList(head) {\n  let prev = null, curr = head;\n  while (curr) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static ListNode reverseList(ListNode head) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  static boolean same(int[] a, int[] b) { return eq(a, b); }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("three", () -> same(ListNode.toArray(reverseList(ListNode.from(1, 2, 3))), new int[] {3, 2, 1}));\n' +
          '    failed += run("one", () -> same(ListNode.toArray(reverseList(ListNode.from(1))), new int[] {1}));\n' +
          '    failed += run("empty", () -> reverseList(null) == null);\n' +
          doneLine() +
          '  }\n',
          '  static class ListNode {\n' +
          '    int val; ListNode next;\n' +
          '    ListNode(int v) { val = v; }\n' +
          '    static ListNode from(int... values) {\n' +
          '      ListNode dummy = new ListNode(0), tail = dummy;\n' +
          '      for (int v : values) { tail.next = new ListNode(v); tail = tail.next; }\n' +
          '      return dummy.next;\n' +
          '    }\n' +
          '    static int[] toArray(ListNode head) {\n' +
          '      ArrayList<Integer> vals = new ArrayList<>();\n' +
          '      for (ListNode c = head; c != null; c = c.next) vals.add(c.val);\n' +
          '      int[] a = new int[vals.size()];\n' +
          '      for (int i = 0; i < a.length; i++) a[i] = vals.get(i);\n' +
          '      return a;\n' +
          '    }\n' +
          '  }\n'
        )
      },
      javascript: {
        starter:
          'function ListNode(val, next) {\n' +
          '  this.val = (val === undefined ? 0 : val);\n' +
          '  this.next = (next === undefined ? null : next);\n' +
          '}\n' +
          'function reverseList(head) {\n' +
          '  // implement — head is { val, next } or null\n' +
          "  throw new Error('implement');\n" +
          '}\n'
      }
    },
    tests: [
      { name: 'three', args: [[1, 2, 3]], expect: [3, 2, 1], check: 'deepEqual' },
      { name: 'one', args: [[1]], expect: [1], check: 'deepEqual' },
      { name: 'empty', args: [[]], expect: [], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'easy',
    topic: 'Dynamic Programming',
    pattern: 'fibonacci',
    fn: 'climbStairs',
    prompt: 'You can climb 1 or 2 steps at a time. Return how many distinct ways you can climb n stairs. This is Fibonacci: ways(n) = ways(n-1) + ways(n-2). Bottom-up with two variables is enough. n ≥ 1.',
    signature: 'int climbStairs(int n)',
    viz: null,
    defaultInput: '5',
    solution: 'function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) { const c = a + b; a = b; b = c; }\n  return b;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int climbStairs(int n) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("2", () -> climbStairs(2) == 2);\n' +
          '    failed += run("3", () -> climbStairs(3) == 3);\n' +
          '    failed += run("4", () -> climbStairs(4) == 5);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('climbStairs', 'n') }
    },
    tests: [
      { name: '2', args: [2], expect: 2, check: 'number' },
      { name: '3', args: [3], expect: 3, check: 'number' },
      { name: '4', args: [4], expect: 5, check: 'number' }
    ]
  });

  list.push({
    id: 'best-time-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'running-minimum',
    fn: 'maxProfit',
    prompt: 'prices[i] is the stock price on day i. You may buy once and sell once later. Return the maximum profit, or 0 if no profit is possible. Track the lowest price so far and the best price - lowest. One pass; nested loops are O(n²) and will be flagged.',
    signature: 'int maxProfit(int[] prices)',
    viz: null,
    defaultInput: '7,1,5,3,6,4',
    solution: 'function maxProfit(prices) {\n  let lo = Infinity, best = 0;\n  for (const p of prices) {\n    if (p < lo) lo = p;\n    else if (p - lo > best) best = p - lo;\n  }\n  return best;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int maxProfit(int[] prices) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("profit", () -> maxProfit(new int[] {7, 1, 5, 3, 6, 4}) == 5);\n' +
          '    failed += run("decreasing", () -> maxProfit(new int[] {7, 6, 4, 3, 1}) == 0);\n' +
          '    failed += run("late peak", () -> maxProfit(new int[] {2, 4, 1, 7}) == 6);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('maxProfit', 'prices') }
    },
    tests: [
      { name: 'profit', args: [[7, 1, 5, 3, 6, 4]], expect: 5, check: 'number' },
      { name: 'decreasing', args: [[7, 6, 4, 3, 1]], expect: 0, check: 'number' },
      { name: 'late peak', args: [[2, 4, 1, 7]], expect: 6, check: 'number' }
    ]
  });

  list.push({
    id: 'rotate-array',
    title: 'Rotate Array',
    difficulty: 'easy',
    topic: 'Arrays',
    pattern: 'reverse-blocks',
    fn: 'rotate',
    prompt: 'Rotate nums to the right by k steps, in place. k may be larger than length — use k % n. The reverse trick: reverse the whole array, reverse the first k items, reverse the rest. An extra buffer is allowed if you mention the O(n) space tradeoff.',
    signature: 'void rotate(int[] nums, int k)',
    viz: 'rotate-array',
    defaultInput: '1,2,3,4,5,6,7 | 3',
    solution: 'function rotate(nums, k) {\n  const n = nums.length; k %= n;\n  const rev = (l, r) => { while (l < r) { const t = nums[l]; nums[l++] = nums[r]; nums[r--] = t; } };\n  rev(0, n - 1); rev(0, k - 1); rev(k, n - 1);\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static void rotate(int[] nums, int k) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("k=3", () -> { int[] a = {1, 2, 3, 4, 5, 6, 7}; rotate(a, 3); return eq(a, new int[] {5, 6, 7, 1, 2, 3, 4}); });\n' +
          '    failed += run("k=2", () -> { int[] a = {-1, -100, 3, 99}; rotate(a, 2); return eq(a, new int[] {3, 99, -1, -100}); });\n' +
          '    failed += run("k>n", () -> { int[] a = {1, 2}; rotate(a, 3); return eq(a, new int[] {2, 1}); });\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('rotate', 'nums, k') }
    },
    tests: [
      { name: 'k=3', args: [[1, 2, 3, 4, 5, 6, 7], 3], expect: [5, 6, 7, 1, 2, 3, 4], check: 'inPlaceArray' },
      { name: 'k=2', args: [[-1, -100, 3, 99], 2], expect: [3, 99, -1, -100], check: 'inPlaceArray' },
      { name: 'k>n', args: [[1, 2], 3], expect: [2, 1], check: 'inPlaceArray' }
    ]
  });

  list.push({
    id: 'fizzbuzz',
    title: 'Fizz Buzz',
    difficulty: 'easy',
    topic: 'Math',
    pattern: 'conditionals',
    fn: 'fizzBuzz',
    prompt: 'Return a list of n strings for i from 1 to n. Multiples of 15 → "FizzBuzz", of 3 → "Fizz", of 5 → "Buzz", otherwise the number as a string. Check 15 first so the overlap is not missed. Java returns List<String>; JS returns an array of strings.',
    signature: 'List<String> fizzBuzz(int n)',
    viz: null,
    defaultInput: '15',
    solution: 'function fizzBuzz(n) {\n  const out = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) out.push("FizzBuzz");\n    else if (i % 3 === 0) out.push("Fizz");\n    else if (i % 5 === 0) out.push("Buzz");\n    else out.push(String(i));\n  }\n  return out;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static List<String> fizzBuzz(int n) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("3", () -> fizzBuzz(3).equals(List.of("1", "2", "Fizz")));\n' +
          '    failed += run("5", () -> fizzBuzz(5).equals(List.of("1", "2", "Fizz", "4", "Buzz")));\n' +
          '    failed += run("15 fizzbuzz", () -> "FizzBuzz".equals(fizzBuzz(15).get(14)));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('fizzBuzz', 'n') }
    },
    tests: [
      { name: '3', args: [3], expect: ['1', '2', 'Fizz'], check: 'deepEqual' },
      { name: '5', args: [5], expect: ['1', '2', 'Fizz', '4', 'Buzz'], check: 'deepEqual' },
      { name: '15 fizzbuzz', args: [15], expect: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'kadane',
    title: 'Maximum Subarray (Kadane)',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'kadane',
    fn: 'maxSubArray',
    prompt: 'Return the largest sum of any contiguous subarray. Kadane: keep a running best-ending-here, reset when it goes negative (or take max(x, best+x)), and track a global max. The array can contain negatives; a single element is a valid subarray. Target O(n) time, O(1) space.',
    signature: 'int maxSubArray(int[] nums)',
    viz: 'kadane',
    defaultInput: '-2,1,-3,4,-1,2,1,-5,4',
    solution: 'function maxSubArray(nums) {\n  let best = nums[0], cur = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    best = Math.max(best, cur);\n  }\n  return best;\n}',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int maxSubArray(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("mixed", () -> maxSubArray(new int[] {-2, 1, -3, 4, -1, 2, 1, -5, 4}) == 6);\n' +
          '    failed += run("single", () -> maxSubArray(new int[] {1}) == 1);\n' +
          '    failed += run("all positive", () -> maxSubArray(new int[] {5, 4, -1, 7, 8}) == 23);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('maxSubArray', 'nums') }
    },
    tests: [
      { name: 'mixed', args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expect: 6, check: 'number' },
      { name: 'single', args: [[1]], expect: 1, check: 'number' },
      { name: 'all positive', args: [[5, 4, -1, 7, 8]], expect: 23, check: 'number' }
    ]
  });

  list.push({
    id: 'longest-substring-no-repeat',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    topic: 'Strings',
    pattern: 'variable-window',
    fn: 'lengthOfLongestSubstring',
    prompt: 'Return the length of the longest substring of s with all unique characters. Sliding window: expand right, and while the window has a duplicate, advance left. A map/set of last-seen indices makes this O(n). Empty string is 0.',
    signature: 'int lengthOfLongestSubstring(String s)',
    viz: 'sliding-window',
    defaultInput: 'abcabcbb',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int lengthOfLongestSubstring(String s) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("abcabcbb", () -> lengthOfLongestSubstring("abcabcbb") == 3);\n' +
          '    failed += run("bbbbb", () -> lengthOfLongestSubstring("bbbbb") == 1);\n' +
          '    failed += run("pwwkew", () -> lengthOfLongestSubstring("pwwkew") == 3);\n' +
          '    failed += run("empty", () -> lengthOfLongestSubstring("") == 0);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('lengthOfLongestSubstring', 's') }
    },
    tests: [
      { name: 'abcabcbb', args: ['abcabcbb'], expect: 3, check: 'number' },
      { name: 'bbbbb', args: ['bbbbb'], expect: 1, check: 'number' },
      { name: 'pwwkew', args: ['pwwkew'], expect: 3, check: 'number' },
      { name: 'empty', args: [''], expect: 0, check: 'number' }
    ]
  });

  list.push({
    id: 'container-water',
    title: 'Container With Most Water',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'two-pointers',
    fn: 'maxArea',
    prompt: 'height[i] is a vertical line at x = i. Choose two lines that form a container with the x-axis holding the most water. Area is min(h[l], h[r]) * (r - l). Two pointers from both ends: move the shorter side inward. O(n), not every pair.',
    signature: 'int maxArea(int[] height)',
    viz: 'two-pointers-water',
    defaultInput: '1,8,6,2,5,4,8,3,7',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int maxArea(int[] height) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("classic", () -> maxArea(new int[] {1, 8, 6, 2, 5, 4, 8, 3, 7}) == 49);\n' +
          '    failed += run("two bars", () -> maxArea(new int[] {1, 1}) == 1);\n' +
          '    failed += run("wide shallow", () -> maxArea(new int[] {4, 3, 2, 1, 4}) == 16);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('maxArea', 'height') }
    },
    tests: [
      { name: 'classic', args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expect: 49, check: 'number' },
      { name: 'two bars', args: [[1, 1]], expect: 1, check: 'number' },
      { name: 'wide shallow', args: [[4, 3, 2, 1, 4]], expect: 16, check: 'number' }
    ]
  });

  list.push({
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'medium',
    topic: 'Intervals',
    pattern: 'sort-and-merge',
    fn: 'merge',
    prompt: 'Given intervals [start, end], merge all overlapping intervals and return the disjoint cover. Sort by start, then walk: if the next interval overlaps the current end, extend the end; otherwise push a new interval. Touching endpoints (e.g. [1,4] and [4,5]) merge. Return intervals in sorted order.',
    signature: 'int[][] merge(int[][] intervals)',
    viz: 'merge-intervals',
    defaultInput: '1,3; 2,6; 8,10; 15,18',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int[][] merge(int[][] intervals) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("overlap", () -> eq(merge(new int[][] {{1, 3}, {2, 6}, {8, 10}, {15, 18}}), new int[][] {{1, 6}, {8, 10}, {15, 18}}));\n' +
          '    failed += run("nested", () -> eq(merge(new int[][] {{1, 4}, {4, 5}}), new int[][] {{1, 5}}));\n' +
          '    failed += run("single", () -> eq(merge(new int[][] {{1, 4}}), new int[][] {{1, 4}}));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('merge', 'intervals') }
    },
    tests: [
      { name: 'overlap', args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expect: [[1, 6], [8, 10], [15, 18]], check: 'deepEqual' },
      { name: 'nested', args: [[[1, 4], [4, 5]]], expect: [[1, 5]], check: 'deepEqual' },
      { name: 'single', args: [[[1, 4]]], expect: [[1, 4]], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'three-sum',
    title: '3Sum',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'two-pointers',
    fn: 'threeSum',
    prompt: 'Return all unique triplets that sum to zero. Sort, then for each index i run two-sum on the suffix with left/right pointers. Skip duplicate values so each triplet appears once. Order of triplets and order inside a triplet do not matter. Target O(n²).',
    signature: 'List<List<Integer>> threeSum(int[] nums)',
    viz: null,
    defaultInput: '-1,0,1,2,-1,-4',
    languages: {
      java: {
        starter: javaStarter(
          '  public static List<List<Integer>> threeSum(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  static String canon(List<List<Integer>> triples) {\n' +
          '    List<String> keys = new ArrayList<>();\n' +
          '    if (triples == null) return "";\n' +
          '    for (List<Integer> t : triples) {\n' +
          '      List<Integer> c = new ArrayList<>(t);\n' +
          '      Collections.sort(c);\n' +
          '      keys.add(c.toString());\n' +
          '    }\n' +
          '    Collections.sort(keys);\n' +
          '    return keys.toString();\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    String classic = canon(List.of(List.of(-1, -1, 2), List.of(-1, 0, 1)));\n' +
          '    failed += run("classic", () -> canon(threeSum(new int[] {-1, 0, 1, 2, -1, -4})).equals(classic));\n' +
          '    failed += run("no triplet", () -> threeSum(new int[] {0, 1, 1}).isEmpty());\n' +
          '    failed += run("zeros", () -> canon(threeSum(new int[] {0, 0, 0})).equals(canon(List.of(List.of(0, 0, 0)))));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('threeSum', 'nums') }
    },
    tests: [
      { name: 'classic', args: [[-1, 0, 1, 2, -1, -4]], expect: [[-1, -1, 2], [-1, 0, 1]], check: 'anyOrderArray' },
      { name: 'no triplet', args: [[0, 1, 1]], expect: [], check: 'anyOrderArray' },
      { name: 'zeros', args: [[0, 0, 0]], expect: [[0, 0, 0]], check: 'anyOrderArray' }
    ]
  });

  list.push({
    id: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'medium',
    topic: 'Strings',
    pattern: 'hash-map',
    fn: 'groupAnagrams',
    prompt: 'Group the strings that are anagrams of each other. A sorted string (or a 26-count signature) is a good map key. Return the groups in any order; strings inside a group may be in any order. Empty strings and single letters are valid groups.',
    signature: 'List<List<String>> groupAnagrams(String[] strs)',
    viz: 'hash-freq',
    defaultInput: 'eat,tea,tan,ate,nat,bat',
    languages: {
      java: {
        starter: javaStarter(
          '  public static List<List<String>> groupAnagrams(String[] strs) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  static String groupsKey(List<List<String>> groups) {\n' +
          '    List<String> keys = new ArrayList<>();\n' +
          '    for (List<String> g : groups) {\n' +
          '      List<String> c = new ArrayList<>(g);\n' +
          '      Collections.sort(c);\n' +
          '      keys.add(String.join(",", c));\n' +
          '    }\n' +
          '    Collections.sort(keys);\n' +
          '    return keys.toString();\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    List<List<String>> expected = List.of(List.of("bat"), List.of("nat", "tan"), List.of("ate", "eat", "tea"));\n' +
          '    failed += run("classic", () -> groupsKey(groupAnagrams(new String[] {"eat", "tea", "tan", "ate", "nat", "bat"})).equals(groupsKey(expected)));\n' +
          '    failed += run("empty strings", () -> groupAnagrams(new String[] {""}).size() == 1);\n' +
          '    failed += run("single", () -> groupsKey(groupAnagrams(new String[] {"a"})).equals(groupsKey(List.of(List.of("a")))));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('groupAnagrams', 'strs') }
    },
    tests: [
      { name: 'classic', args: [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], expect: [['bat'], ['nat', 'tan'], ['ate', 'eat', 'tea']], check: 'anyOrderArray' },
      { name: 'empty strings', args: [['']], expect: [['']], check: 'anyOrderArray' },
      { name: 'single', args: [['a']], expect: [['a']], check: 'anyOrderArray' }
    ]
  });

  list.push({
    id: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'medium',
    topic: 'Graphs',
    pattern: 'grid-dfs',
    fn: 'numIslands',
    prompt: 'grid is a 2D array of "1" (land) and "0" (water). An island is 4-directionally connected land. Return the number of islands. DFS or BFS: when you find a "1", flood-fill (or mark visited) the whole component and increment the count. Mutating the grid in place is fine.',
    signature: 'int numIslands(char[][] grid)',
    viz: 'grid-dfs',
    defaultInput: '11110\n11010\n11000\n00000',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int numIslands(char[][] grid) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("one island", () -> numIslands(new char[][] {\n' +
          "      {'1','1','1','1','0'}, {'1','1','0','1','0'}, {'1','1','0','0','0'}, {'0','0','0','0','0'}\n" +
          '    }) == 1);\n' +
          '    failed += run("three islands", () -> numIslands(new char[][] {\n' +
          "      {'1','1','0','0','0'}, {'1','1','0','0','0'}, {'0','0','1','0','0'}, {'0','0','0','1','1'}\n" +
          '    }) == 3);\n' +
          "    failed += run(\"empty\", () -> numIslands(new char[][] {{'0','0'}, {'0','0'}}) == 0);\n" +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('numIslands', 'grid') }
    },
    tests: [
      { name: 'one island', args: [[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]], expect: 1, check: 'number' },
      { name: 'three islands', args: [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]], expect: 3, check: 'number' },
      { name: 'empty', args: [[['0', '0'], ['0', '0']]], expect: 0, check: 'number' }
    ]
  });

  list.push({
    id: 'coin-change',
    title: 'Coin Change',
    difficulty: 'medium',
    topic: 'Dynamic Programming',
    pattern: 'unbounded-knapsack',
    fn: 'coinChange',
    prompt: 'Return the fewest coins needed to make amount using unlimited coins from the coins array. If it is impossible, return -1. 1D DP: dp[x] is the min coins for value x; for each coin, relax dp[c..amount]. amount 0 is 0 coins. Target O(amount * coins.length).',
    signature: 'int coinChange(int[] coins, int amount)',
    viz: null,
    defaultInput: '1,2,5 | 11',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int coinChange(int[] coins, int amount) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("classic", () -> coinChange(new int[] {1, 2, 5}, 11) == 3);\n' +
          '    failed += run("impossible", () -> coinChange(new int[] {2}, 3) == -1);\n' +
          '    failed += run("zero amount", () -> coinChange(new int[] {1}, 0) == 0);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('coinChange', 'coins, amount') }
    },
    tests: [
      { name: 'classic', args: [[1, 2, 5], 11], expect: 3, check: 'number' },
      { name: 'impossible', args: [[2], 3], expect: -1, check: 'number' },
      { name: 'zero amount', args: [[1], 0], expect: 0, check: 'number' }
    ]
  });

  list.push({
    id: 'daily-temperatures',
    title: 'Daily Temperatures',
    difficulty: 'medium',
    topic: 'Stack',
    pattern: 'monotonic-stack',
    fn: 'dailyTemperatures',
    prompt: 'For each day, return how many days you wait until a warmer temperature. If none, that index is 0. Monotonic decreasing stack of indices: when today is warmer than the stack top, pop and fill the wait. O(n) time. Do not nest a scan per day.',
    signature: 'int[] dailyTemperatures(int[] temperatures)',
    viz: null,
    defaultInput: '73,74,75,71,69,72,76,73',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int[] dailyTemperatures(int[] temperatures) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("classic", () -> eq(dailyTemperatures(new int[] {73, 74, 75, 71, 69, 72, 76, 73}), new int[] {1, 1, 4, 2, 1, 1, 0, 0}));\n' +
          '    failed += run("decreasing", () -> eq(dailyTemperatures(new int[] {30, 20, 10}), new int[] {0, 0, 0}));\n' +
          '    failed += run("single", () -> eq(dailyTemperatures(new int[] {55}), new int[] {0}));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('dailyTemperatures', 'temperatures') }
    },
    tests: [
      { name: 'classic', args: [[73, 74, 75, 71, 69, 72, 76, 73]], expect: [1, 1, 4, 2, 1, 1, 0, 0], check: 'deepEqual' },
      { name: 'decreasing', args: [[30, 20, 10]], expect: [0, 0, 0], check: 'deepEqual' },
      { name: 'single', args: [[55]], expect: [0], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'product-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    topic: 'Arrays',
    pattern: 'prefix-suffix',
    fn: 'productExceptSelf',
    prompt: 'Return an array answer where answer[i] is the product of every nums[j] with j != i. Do not use division. Prefix products from the left and suffix from the right. Zeros in the input are allowed. Target O(n) time and O(1) extra space besides the output array.',
    signature: 'int[] productExceptSelf(int[] nums)',
    viz: null,
    defaultInput: '1,2,3,4',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int[] productExceptSelf(int[] nums) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("no zeros", () -> eq(productExceptSelf(new int[] {1, 2, 3, 4}), new int[] {24, 12, 8, 6}));\n' +
          '    failed += run("one zero", () -> eq(productExceptSelf(new int[] {-1, 1, 0, -3, 3}), new int[] {0, 0, 9, 0, 0}));\n' +
          '    failed += run("two elements", () -> eq(productExceptSelf(new int[] {2, 3}), new int[] {3, 2}));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('productExceptSelf', 'nums') }
    },
    tests: [
      { name: 'no zeros', args: [[1, 2, 3, 4]], expect: [24, 12, 8, 6], check: 'deepEqual' },
      { name: 'one zero', args: [[-1, 1, 0, -3, 3]], expect: [0, 0, 9, 0, 0], check: 'deepEqual' },
      { name: 'two elements', args: [[2, 3]], expect: [3, 2], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'search-rotated',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    topic: 'Binary Search',
    pattern: 'rotated-binary-search',
    fn: 'searchRotated',
    prompt: 'nums is a distinct-valued array that was rotated at an unknown pivot. Return the index of target or -1. Still O(log n): at mid, one half is sorted — if target lies in that half, shrink there, otherwise search the other half. Do not call a library sort or scan linearly.',
    signature: 'int search(int[] nums, int target)',
    viz: 'binary-search',
    defaultInput: '4,5,6,7,0,1,2 | 0',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int search(int[] nums, int target) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("rotated", () -> search(new int[] {4, 5, 6, 7, 0, 1, 2}, 0) == 4);\n' +
          '    failed += run("not found", () -> search(new int[] {4, 5, 6, 7, 0, 1, 2}, 3) == -1);\n' +
          '    failed += run("single", () -> search(new int[] {1}, 1) == 0);\n' +
          '    failed += run("no rotation", () -> search(new int[] {1, 3, 5}, 3) == 1);\n' +
          doneLine() +
          '  }\n'
        ),
        wrapperNote: 'Java method name is search. JS function is searchRotated so it does not clash with binary-search.'
      },
      javascript: { starter: jsFn('searchRotated', 'nums, target') }
    },
    tests: [
      { name: 'rotated', args: [[4, 5, 6, 7, 0, 1, 2], 0], expect: 4, check: 'number' },
      { name: 'not found', args: [[4, 5, 6, 7, 0, 1, 2], 3], expect: -1, check: 'number' },
      { name: 'single', args: [[1], 1], expect: 0, check: 'number' },
      { name: 'no rotation', args: [[1, 3, 5], 3], expect: 1, check: 'number' }
    ]
  });

  list.push({
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    topic: 'Arrays',
    pattern: 'two-pointers',
    fn: 'trap',
    prompt: 'height[i] is an elevation map. Compute how much water it can trap after raining. Water at i is min(leftMax, rightMax) - height[i] when that is positive. Two pointers with running left/right max is O(n) time and O(1) space; prefix max arrays also work. Empty or flat maps trap 0.',
    signature: 'int trap(int[] height)',
    viz: 'two-pointers-water',
    defaultInput: '0,1,0,2,1,0,1,3,2,1,2,1',
    languages: {
      java: {
        starter: javaStarter(
          '  public static int trap(int[] height) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("classic", () -> trap(new int[] {0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}) == 6);\n' +
          '    failed += run("empty", () -> trap(new int[] {}) == 0);\n' +
          '    failed += run("flat", () -> trap(new int[] {2, 2, 2}) == 0);\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('trap', 'height') }
    },
    tests: [
      { name: 'classic', args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expect: 6, check: 'number' },
      { name: 'empty', args: [[]], expect: 0, check: 'number' },
      { name: 'flat', args: [[2, 2, 2]], expect: 0, check: 'number' }
    ]
  });

  list.push({
    id: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'hard',
    topic: 'Design',
    pattern: 'hashmap-plus-list',
    fn: 'LRUCache',
    prompt: 'Design an LRU cache with capacity. get(key) returns the value or -1. put(key, value) inserts or updates and marks the key most recently used. When capacity is exceeded, evict the least recently used key. get and put must be O(1): HashMap plus doubly linked list (or LinkedHashMap in Java). JS: implement class LRUCache.',
    signature: 'class LRUCache { LRUCache(int capacity); int get(int key); void put(int key, int value); }',
    viz: null,
    defaultInput: 'capacity 2',
    languages: {
      java: {
        starter: javaStarter(
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("example", () -> {\n' +
          '      LRUCache cache = new LRUCache(2);\n' +
          '      cache.put(1, 1);\n' +
          '      cache.put(2, 2);\n' +
          '      if (cache.get(1) != 1) return false;\n' +
          '      cache.put(3, 3);\n' +
          '      if (cache.get(2) != -1) return false;\n' +
          '      cache.put(4, 4);\n' +
          '      if (cache.get(1) != -1) return false;\n' +
          '      if (cache.get(3) != 3) return false;\n' +
          '      return cache.get(4) == 4;\n' +
          '    });\n' +
          '    failed += run("update", () -> {\n' +
          '      LRUCache cache = new LRUCache(1);\n' +
          '      cache.put(2, 1);\n' +
          '      return cache.get(2) == 1;\n' +
          '    });\n' +
          '    failed += run("overwrite", () -> {\n' +
          '      LRUCache cache = new LRUCache(2);\n' +
          '      cache.put(2, 1);\n' +
          '      cache.put(2, 2);\n' +
          '      return cache.get(2) == 2;\n' +
          '    });\n' +
          doneLine() +
          '  }\n',
          '  static class LRUCache {\n' +
          '    public LRUCache(int capacity) {\n' +
          '      // implement\n' +
          '    }\n' +
          '    public int get(int key) {\n' +
          '      // implement\n' +
          '      throw new UnsupportedOperationException("implement");\n' +
          '    }\n' +
          '    public void put(int key, int value) {\n' +
          '      // implement\n' +
          '      throw new UnsupportedOperationException("implement");\n' +
          '    }\n' +
          '  }\n'
        ),
        wrapperNote: 'Implement the nested LRUCache class. main() already drives get/put sequences.'
      },
      javascript: {
        starter:
          'class LRUCache {\n' +
          '  constructor(capacity) {\n' +
          '    // implement\n' +
          '    this.capacity = capacity;\n' +
          '  }\n' +
          '  get(key) {\n' +
          '    // implement\n' +
          "    throw new Error('implement');\n" +
          '  }\n' +
          '  put(key, value) {\n' +
          '    // implement\n' +
          "    throw new Error('implement');\n" +
          '  }\n' +
          '}\n'
      }
    },
    tests: [
      { name: 'example', args: [2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]]], expect: [1, -1, -1, 3, 4], check: 'deepEqual' },
      { name: 'update', args: [1, [['put', 2, 1], ['get', 2]]], expect: [1], check: 'deepEqual' },
      { name: 'overwrite', args: [2, [['put', 2, 1], ['put', 2, 2], ['get', 2]]], expect: [2], check: 'deepEqual' }
    ]
  });

  list.push({
    id: 'word-break',
    title: 'Word Break',
    difficulty: 'hard',
    topic: 'Dynamic Programming',
    pattern: 'word-break',
    fn: 'wordBreak',
    prompt: 'Return true if s can be segmented into a space-separated sequence of one or more dictionary words. Words may be reused. DP: dp[i] is true if s[0..i) can be broken; try every word ending at i. "catsandog" with cats/dog/sand/and/cat is false because of the leftover og.',
    signature: 'boolean wordBreak(String s, String[] wordDict)',
    viz: null,
    defaultInput: 'leetcode | leet,code',
    languages: {
      java: {
        starter: javaStarter(
          '  public static boolean wordBreak(String s, String[] wordDict) {\n' +
          '    // implement\n' +
          '    throw new UnsupportedOperationException("implement");\n' +
          '  }\n' +
          '  public static void main(String[] args) {\n' +
          '    int failed = 0;\n' +
          '    failed += run("leetcode", () -> wordBreak("leetcode", new String[] {"leet", "code"}));\n' +
          '    failed += run("catsandog", () -> !wordBreak("catsandog", new String[] {"cats", "dog", "sand", "and", "cat"}));\n' +
          '    failed += run("applepen", () -> wordBreak("applepenapple", new String[] {"apple", "pen"}));\n' +
          doneLine() +
          '  }\n'
        )
      },
      javascript: { starter: jsFn('wordBreak', 's, wordDict') }
    },
    tests: [
      { name: 'leetcode', args: ['leetcode', ['leet', 'code']], expect: true, check: 'boolean' },
      { name: 'catsandog', args: ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], expect: false, check: 'boolean' },
      { name: 'applepen', args: ['applepenapple', ['apple', 'pen']], expect: true, check: 'boolean' }
    ]
  });

  global.Problems = {
    list: list,
    byId: function (id) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i];
      }
      return null;
    }
  };
})(window);
