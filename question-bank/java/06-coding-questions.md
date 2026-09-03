# Java Coding Questions Asked in SDET Rounds

SDET II–III coding rounds still use these string/array/map problems, often with a "now do it without converting to String" or "now discuss complexity" follow-up. Solutions are Java 17-ready (records, `var` only where it stays obvious, `Map.of` avoided when the map must be mutable). Each problem has a statement, an interview-ready solution, complexity, and variations. Say time/space before you type. Tie to test data when it helps.

- Q1. Reverse a string without `reverse()`
- Q2. Anagrams
- Q3. Rotate array by K
- Q4. Find duplicates in an array
- Q5. Reverse first and last digit of a number WITHOUT converting to String
- Q6. First non-repeating character
- Q7. Two sum
- Q8. Reverse words in a sentence
- Q9. Palindrome number / string
- Q10. Fibonacci (iterative; recursion cost)
- Q11. Frequency count / most frequent element
- Q12. Merge two sorted arrays
- Q13. Flatten nested list
- Q14. Valid parentheses
- Q15. Longest substring without repeating chars (medium — SDET III)
- Q16. LRU cache sketch / group-anagrams

### Q1. Reverse a string without `reverse()`

**Problem** — Given a `String`, return a new string with characters in reverse order. Do not call `StringBuilder.reverse()` unless they allow it as a footnote.

**Interview answer** — Convert to `char[]` and two-pointer swap, or build from the end with a `StringBuilder`. I mention that UTF-16 surrogate pairs (emoji) break a naive `char` reverse; iterating code points is the Unicode-safer version. `new StringBuilder(s).reverse()` exists and is what I'd ship in production.

**Code**

```java
static String reverse(String s) {
    char[] a = s.toCharArray();
    int i = 0, j = a.length - 1;
    while (i < j) {
        char tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
        i++;
        j--;
    }
    return new String(a);
}

static String reverseCodePoints(String s) {
    int[] cps = s.codePoints().toArray();
    StringBuilder sb = new StringBuilder(s.length());
    for (int k = cps.length - 1; k >= 0; k--) sb.appendCodePoint(cps[k]);
    return sb.toString();
}
```

**Complexity** — O(n) time, O(n) space (Java strings are immutable, so a copy is required).

**Follow-ups & traps**

- Variation: reverse in-place is impossible on `String`; they want the `char[]` story.
- Variation: reverse words, not letters (Q8).
- Trap: `s += s.charAt(i)` from the end without StringBuilder — O(n²) (see strings file).
- Null: ask; typically NPE or treat as empty.

**One-liner** — Two-pointer a `char[]`; strings are immutable, and `reverse()` was the banned one-liner.

### Q2. Anagrams

**Problem** — Return whether two strings contain the same characters with the same frequencies (`listen`/`silent`).

**Interview answer** — If lengths differ, false. Count frequencies of the first, decrement with the second, fail on a missing or exhausted character. Sorting both and comparing is O(n log n) and fine for short strings. Clarify case and whitespace before coding.

**Code**

```java
static boolean anagrams(String a, String b) {
    if (a.length() != b.length()) return false;
    int[] freq = new int[256];          // or HashMap for full Unicode
    for (int i = 0; i < a.length(); i++) freq[a.charAt(i)]++;
    for (int i = 0; i < b.length(); i++) {
        if (--freq[b.charAt(i)] < 0) return false;
    }
    return true;
}

static boolean anagramsSort(String a, String b) {
    if (a.length() != b.length()) return false;
    char[] x = a.toCharArray(), y = b.toCharArray();
    Arrays.sort(x);
    Arrays.sort(y);
    return Arrays.equals(x, y);
}
```

**Complexity** — Count: O(n) time, O(1) space for a fixed alphabet. Sort: O(n log n) time, O(n) space.

**Follow-ups & traps**

- Variation: ignore case/spaces — `toLowerCase(Locale.ROOT)` and strip non-letters.
- Variation: group anagrams (Q16).
- Trap: `==` on sorted strings instead of `Arrays.equals`.
- Unicode: `int[256]` is a lie for real text; say HashMap or `int[Character.MAX_VALUE+1]` cost.
- Interviewers often ask you to walk `"listen"`/`"silent"` on the array — do it aloud.

**One-liner** — Length check, count one string, decrement the other; any negative count means not anagrams.

### Q3. Rotate array by K

**Problem** — Rotate `int[]` to the right by `k` steps in-place if possible (`[1,2,3,4,5]`, k=2 → `[4,5,1,2,3]`).

**Interview answer** — `k %= n`. The reverse trick: reverse the whole array, reverse the first `k`, reverse the rest. Extra-array copy is easier to get right under time pressure. Left vs right rotation: clarify.

**Code**

```java
static void rotateRight(int[] a, int k) {
    int n = a.length;
    if (n == 0) return;
    k %= n;
    if (k < 0) k += n;                 // tolerate negative as left
    reverse(a, 0, n - 1);
    reverse(a, 0, k - 1);
    reverse(a, k, n - 1);
}

static void reverse(int[] a, int i, int j) {
    while (i < j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
        i++;
        j--;
    }
}

static int[] rotateCopy(int[] a, int k) {
    int n = a.length;
    int[] out = new int[n];
    for (int i = 0; i < n; i++) out[(i + k) % n] = a[i];
    return out;
}
```

**Complexity** — Reverse method: O(n) time, O(1) extra space. Copy: O(n) time and space.

**Follow-ups & traps**

- Trap: `k > n` without modulo — `ArrayIndexOutOfBounds`.
- Empty array; k=0; k negative.
- Variation: rotate a `List<WebElement>` of carousel slides — same modulo idea, don't mutate live DOM lists blindly.

**One-liner** — `k %= n`, reverse all, reverse first k, reverse the rest — O(n)/O(1).

### Q4. Find duplicates in an array

**Problem** — Return the values that appear more than once. Typical: `int[]` or `String[]` of test names.

**Interview answer** — One `HashSet` for seen, one for duplicates so each value is reported once. Sorting and scanning neighbors is O(n log n) extra-space-light for primitives. Nested loops are O(n²) — mention and skip.

**Code**

```java
static List<String> duplicates(String[] items) {
    Set<String> seen = new HashSet<>();
    Set<String> dupes = new LinkedHashSet<>(); // stable order
    for (String x : items) {
        if (!seen.add(x)) dupes.add(x);
    }
    return new ArrayList<>(dupes);
}

static List<Integer> duplicatesSorted(int[] a) {
    Arrays.sort(a);
    List<Integer> dupes = new ArrayList<>();
    for (int i = 1; i < a.length; i++) {
        if (a[i] == a[i - 1] && (dupes.isEmpty() || dupes.get(dupes.size() - 1) != a[i])) {
            dupes.add(a[i]);
        }
    }
    return dupes;
}
```

**Complexity** — Set: O(n) time average, O(n) space. Sort: O(n log n) time, O(1) extra if mutating.

**Follow-ups & traps**

- Variation: objects by `id` — Set of the key, not the object (`equals` trap).
- Variation: all values with count > 1 as a frequency map (Q11).
- Trap: `list.contains` in a loop — O(n²).
- `Set.add` returns false if already present — that is the duplicate check.

**One-liner** — Seen-set plus dupes-set; `add` returning false is the duplicate — O(n).

### Q5. Reverse first and last digit of a number WITHOUT converting to String

**Problem** — Given an `int` `n`, swap its first and last decimal digits using arithmetic only. Example: `12345 → 52341`. This is the classic "don't use String" SDET prompt — do it with `log10` / powers of ten, and call out leading zeros.

**Interview answer** — Last digit is `n % 10`. Digit count is `floor(log10(|n|)) + 1`; first digit is `n / 10^(digits-1)`. Strip first and last, keep the middle, then `last * pow + middle * 10 + first`. Negative: sign apart, recurse on abs. Integers cannot keep leading zeros: `100 → 001` becomes `1` — say that out loud so they know you noticed. `n < 10` is a no-op.

**Code**

```java
static int swapFirstLast(int n) {
    if (n < 0) return -swapFirstLast(-n);
    if (n < 10) return n;
    int digits = (int) Math.log10(n);          // digits - 1
    int pow = (int) Math.pow(10, digits);      // 10^(digits-1)
    int first = n / pow;
    int last = n % 10;
    int middle = (n % pow) / 10;               // drop first, then drop last
    return last * pow + middle * 10 + first;
}

// Walkthrough: 12345
// digits=4, pow=10000, first=1, last=5, middle=234 → 5*10000 + 234*10 + 1 = 52341
// 100 → first=1, last=0, middle=0 → 1  (001 cannot be an int)
```

**Complexity** — O(1) time/space for a 32-bit int (`log10` is constant for this domain). Overflow: `int` last*pow can theoretically overflow for values near `Integer.MAX_VALUE`; use `long` for the return if they care.

**Follow-ups & traps**

- Trap: converting to String then swapping chars — they will fail you if the constraint was arithmetic.
- `Math.pow` returns double — rounding at huge magnitudes; for `int` it is safe.
- Variation: reverse the whole number without String (classic palindrome helper, Q9).
- 10, 1000, single digit, negative.
- Walk 12345 on the whiteboard: pow=10000, first=1, last=5, middle=234, result=52341.
- Don't use `String.valueOf` "just to get length" — `log10` is the length trick they want.


- Negative: peel the sign, swap, reapply.
- Walk 100 → 1 and say leading zeros aloud.
- Use long if they worry about overflow on last*pow.

**Code**

```java
assert swapFirstLast(12345) == 52341;
assert swapFirstLast(7) == 7;
assert swapFirstLast(100) == 1;
```

**One-liner** — Last is `% 10`, first is `/ 10^(len-1)`, reassemble `last * pow + middle * 10 + first` — ints cannot preserve leading zeros.

### Q6. First non-repeating character

**Problem** — In a string, return the first character whose count is 1, or a sentinel (`null` / `'\\0'`).

**Interview answer** — Two passes: count in a `LinkedHashMap` or `int[256]`, then scan the string in order for count == 1. LinkedHashMap preserves first-seen order so you can iterate the map instead of the string — same idea. Nested `indexOf`/`lastIndexOf` is O(n²).

**Code**

```java
static Character firstNonRepeating(String s) {
    int[] freq = new int[256];
    for (int i = 0; i < s.length(); i++) freq[s.charAt(i)]++;
    for (int i = 0; i < s.length(); i++) {
        if (freq[s.charAt(i)] == 1) return s.charAt(i);
    }
    return null;
}

static Character firstNonRepeatingMap(String s) {
    Map<Character, Integer> freq = new LinkedHashMap<>();
    for (char c : s.toCharArray()) freq.merge(c, 1, Integer::sum);
    for (var e : freq.entrySet()) {
        if (e.getValue() == 1) return e.getKey();
    }
    return null;
}
```

**Complexity** — O(n) time, O(k) space (alphabet).

**Follow-ups & traps**

- Variation: first repeating character — one Set, return on `!add`.
- Variation: stream of characters (online) — LinkedHashMap of counts plus a queue of candidates.
- `"swiss"` → `'w'`. Empty → null.
- Don't return `' '` without asking if space counts.
- `"aabb"` → null; `"leetcode"` → `'l'`.
- One-pass LinkedHashMap: first entry with count 1 after the scan.

**One-liner** — Count, then scan in original order for frequency 1 — order comes from the string, not a HashMap.

### Q7. Two sum

**Problem** — Given `int[] nums` and `target`, return indices of two numbers that add to target. Assume one solution (or specify).

**Interview answer** — One pass HashMap from `value → index`. For each `x`, if `target - x` is in the map, return those indices. Don't use the same element twice (`i != j`). Sorting + two pointers finds *values* but scrambles indices unless you keep pairs.

**Code**

```java
static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // value -> index
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        Integer j = seen.get(need);
        if (j != null) return new int[] { j, i };
        seen.put(nums[i], i);
    }
    throw new IllegalArgumentException("no pair");
}
```

**Complexity** — O(n) time average, O(n) space.

**Follow-ups & traps**

- Trap: `need == nums[i]` using the same index — the map is populated *after* the check, so it is safe.
- Duplicate values: map stores the latest index; still correct for one pair.
- Variation: all pairs; 3-sum (sort + two pointer).
- Overflow: `target - nums[i]` for ints near extremes — use `long` if they pick nits.
- Return indices, not values, unless they ask values.
- Empty array / no pair: throw or return `{-1,-1}` — agree first.


- Insert into the map after the lookup so you don't use the same index.
- Agree on return value when no pair exists.
- Sorting loses indices unless you store pairs.

**Code**

```java
assert Arrays.equals(twoSum(new int[]{2,7,11,15}, 9), new int[]{0,1});
```

**One-liner** — Map of seen values to indices; look up `target - x` before inserting `x`.

### Q8. Reverse words in a sentence

**Problem** — `"run all tests"` → `"tests all run"`. Words split on spaces; clarify multiple spaces and punctuation.

**Interview answer** — `split` on space, reverse the array of words, join. Manual: two pointers on a `String[]`. In-place reverse of the whole `char[]` then reverse each word is the O(1) extra-space classic if they forbid split. Ask whether to collapse whitespace.

**Code**

```java
static String reverseWords(String s) {
    String[] parts = s.trim().split("\\s+");
    int i = 0, j = parts.length - 1;
    while (i < j) {
        String tmp = parts[i];
        parts[i] = parts[j];
        parts[j] = tmp;
        i++;
        j--;
    }
    return String.join(" ", parts);
}

static String reverseWordsManual(String s) {
    char[] a = s.toCharArray();
    reverse(a, 0, a.length - 1);
    int start = 0;
    for (int end = 0; end <= a.length; end++) {
        if (end == a.length || a[end] == ' ') {
            reverse(a, start, end - 1);
            start = end + 1;
        }
    }
    return new String(a);
}

static void reverse(char[] a, int i, int j) {
    while (i < j) {
        char t = a[i]; a[i] = a[j]; a[j] = t; i++; j--;
    }
}
```

**Complexity** — O(n) time, O(n) space (`split`). Manual reverse is O(n) time, O(n) for the char copy (String still immutable).

**Follow-ups & traps**

- `split(" ")` keeps empty tokens for double spaces; `\\s+` after `trim` is usually what they want.
- Leading/trailing spaces.
- Variation: reverse letters of each word but keep order (`"run all"` → `"nur lla"`).

**One-liner** — Split on whitespace, two-pointer the words, join — or reverse the whole buffer then reverse each word.

### Q9. Palindrome number / string

**Problem** — A string reads the same forwards and backwards; a number does too without converting to String if they ask (same spirit as Q5).

**Interview answer** — String: two pointers, skip non-alphanumeric if it's the "valid palindrome" variant, case-fold with `Character.toLowerCase`. Number: reverse half the digits until `rev >= n`, handle negatives as false, trailing zeros (10 is not a palindrome). Reversing the whole int can overflow; reversing half is the LeetCode trick.

**Code**

```java
static boolean palindromeString(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        if (s.charAt(i) != s.charAt(j)) return false;
        i++;
        j--;
    }
    return true;
}

static boolean palindromeNumber(int n) {
    if (n < 0 || (n % 10 == 0 && n != 0)) return false;
    int rev = 0;
    while (n > rev) {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    return n == rev || n == rev / 10;   // even / odd digit counts
}
```

**Complexity** — O(n) time, O(1) space for both (string pointers; number is digit count).

**Follow-ups & traps**

- Negative numbers: usually not palindromes (`-121` vs `"121-"`).
- `Integer.MAX_VALUE` overflow if you reverse the whole number into an int — half-reverse avoids it.
- Empty string is a palindrome by the two-pointer definition.

**One-liner** — Two pointers on the string; for ints reverse half the digits so you never overflow and never use String.

### Q10. Fibonacci (iterative; mention recursion cost)

**Problem** — Return F(n) where F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).

**Interview answer** — Iterate with two variables. Naive recursion is O(φ^n) and recomputes subtrees — fine to mention, not to ship. Memoized recursion is O(n) with a map/array. `long` overflows past n=92; `BigInteger` if they want exact. Closed form (Binet) is interview trivia, rounding issues.

**Code**

```java
static long fib(int n) {
    if (n < 0) throw new IllegalArgumentException("n");
    if (n < 2) return n;
    long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long next = a + b;
        a = b;
        b = next;
    }
    return b;
}

static int fibNaive(int n) {            // DON'T use — exponential
    if (n < 2) return n;
    return fibNaive(n - 1) + fibNaive(n - 2);
}
```

**Complexity** — Iterative: O(n) time, O(1) space. Naive recursion: O(φ^n) time, O(n) stack. Memo: O(n) time and space.

**Follow-ups & traps**

- StackOverflowError on naive recursion for large n (memory file Q5).
- Overflow silently wrapping `long`.
- Variation: last digit of F(n) — pisano period for 10.
- Draw the recursion tree for n=5 if they doubt exponential cost.
- `BigInteger` when they say "exact F(200)."


- Iterative two-variable is the answer they want to ship.
- Naive recursion: draw F(5) tree; mention StackOverflowError.
- long overflows after n=92.

**Code**

```java
assert fib(0) == 0 && fib(1) == 1 && fib(10) == 55;
```

**One-liner** — Two running totals in a loop, O(n)/O(1); naive recursion is exponential and can blow the stack.

### Q11. Frequency count / most frequent element

**Problem** — Count occurrences; return the element with the highest count (tie: specify first-seen or any).

**Interview answer** — `HashMap` increment (`merge` or `getOrDefault`). Then one pass for the max. For lowercase letters, `int[26]`. Streams: `groupingBy(identity(), counting())` then `max(comparingByValue)`.

**Code**

```java
static Map<String, Integer> frequency(List<String> items) {
    Map<String, Integer> freq = new LinkedHashMap<>();
    for (String x : items) freq.merge(x, 1, Integer::sum);
    return freq;
}

static String mostFrequent(List<String> items) {
    if (items.isEmpty()) throw new IllegalArgumentException("empty");
    Map<String, Integer> freq = frequency(items);
    String best = null;
    int max = -1;
    for (var e : freq.entrySet()) {     // LinkedHashMap → first-seen on ties
        if (e.getValue() > max) {
            max = e.getValue();
            best = e.getKey();
        }
    }
    return best;
}
```

**Complexity** — O(n) time, O(k) space.

**Follow-ups & traps**

- Tie-breaking: LinkedHashMap vs any HashMap.
- `int[]` for bounded alphabets beats HashMap.
- Rest Assured: frequency of status codes in a list of Responses — same map.
- Empty input.

**One-liner** — Map merge +1, then track max; LinkedHashMap if the first-seen winner on ties matters.

### Q12. Merge two sorted arrays

**Problem** — Merge two sorted `int[]` into one sorted array. Follow-up: merge into `a` that has buffer at the end (LeetCode 88).

**Interview answer** — Two pointers from the start into a new array, take the smaller each time, then copy the remainder. In-place into a padded `a`: fill from the **end** so you don't overwrite unmerged values.

**Code**

```java
static int[] merge(int[] a, int[] b) {
    int[] out = new int[a.length + b.length];
    int i = 0, j = 0, k = 0;
    while (i < a.length && j < b.length) {
        out[k++] = (a[i] <= b[j]) ? a[i++] : b[j++];
    }
    while (i < a.length) out[k++] = a[i++];
    while (j < b.length) out[k++] = b[j++];
    return out;
}

/** a has length m+n with trailing unused 0s; m, n are filled lengths */
static void mergeInto(int[] a, int m, int[] b, int n) {
    int i = m - 1, j = n - 1, k = m + n - 1;
    while (j >= 0) {
        if (i >= 0 && a[i] > b[j]) a[k--] = a[i--];
        else a[k--] = b[j--];
    }
}
```

**Complexity** — O(m+n) time, O(m+n) space for a new array; in-place version O(1) extra space.

**Follow-ups & traps**

- Trap: concatenating then `Arrays.sort` — O((m+n) log(m+n)), wastes the sorted property.
- Unstable vs stable: `<=` keeps equals from `a` first.
- Lists of timestamps from two log files — same two-pointer merge.

**One-liner** — Two pointers, always take the smaller head; if merging into a buffer, fill from the tail.

### Q13. Flatten nested list

**Problem** — Flatten `List<List<T>>` or a recursively nested structure (`List<Object>` of integers and lists — LeetCode NestedIterator). SDET flavor: flatten JSON arrays of tags, or TestNG data providers.

**Interview answer** — One level: loop or `stream().flatMap(List::stream)`. Recursive nesting: DFS recursion or an explicit stack. Watch stack depth on pathological input; iterative stack is safer.

**Code**

```java
static <T> List<T> flattenOneLevel(List<List<T>> nested) {
    List<T> out = new ArrayList<>();
    for (List<T> inner : nested) out.addAll(inner);
    return out;
}

@SuppressWarnings("unchecked")
static List<Object> flattenDeep(List<?> nested) {
    List<Object> out = new ArrayList<>();
    Deque<Object> stack = new ArrayDeque<>();
    for (int i = nested.size() - 1; i >= 0; i--) stack.push(nested.get(i));
    while (!stack.isEmpty()) {
        Object x = stack.pop();
        if (x instanceof List<?> list) {
            for (int i = list.size() - 1; i >= 0; i--) stack.push(list.get(i));
        } else {
            out.add(x);
        }
    }
    return out;
}
```

**Complexity** — O(n) time in total elements, O(n) space for the output (plus O(depth) stack).

**Follow-ups & traps**

- `flatMap` vs nested for-loops — same complexity; loops are easier to debug on a whiteboard.
- Null inner lists — NPE; skip or treat as empty.
- Variation: flatten a Map of lists of failures (report).

**One-liner** — One level is addAll/flatMap; deep flatten is a stack DFS so you don't blow the call stack.

### Q14. Valid parentheses

**Problem** — `"()[]{}"` is valid; `"(]"` and `"([)]"` are not. Only `()[]{}`.

**Interview answer** — Stack of opening brackets. On a closer, pop and match; mismatch or leftover openings → false. `ArrayDeque` as the stack, not `java.util.Stack`. Map closers to openers.

**Code**

```java
static boolean validParentheses(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        switch (c) {
            case '(' , '[' , '{' -> st.push(c);
            case ')' -> { if (st.isEmpty() || st.pop() != '(') return false; }
            case ']' -> { if (st.isEmpty() || st.pop() != '[') return false; }
            case '}' -> { if (st.isEmpty() || st.pop() != '{') return false; }
            default -> { return false; } // or ignore if they allow other chars
        }
    }
    return st.isEmpty();
}
```

**Complexity** — O(n) time, O(n) space worst case (`((((`).

**Follow-ups & traps**

- Empty string is valid.
- Pop on empty stack — check `isEmpty` first.
- Variation: only `()` — a counter is enough (increment/decrement, never negative, end at 0).
- HTML-tag matching is the same stack idea.
- `"([)]"` is the case that a counter-only solution fails — you need the stack.
- Odd length can still be valid? No for this alphabet; still run the algorithm.


- ArrayDeque not java.util.Stack.
- Counter-only works for a single bracket type.
- Empty string is valid.

**Code**

```java
assert validParentheses("()[]{}");
assert !validParentheses("([)]");
```

**One-liner** — Push openers, pop on closers and match; empty stack at the end — ArrayDeque, not Stack.

### Q15. Longest substring without repeating chars (medium — SDET III)

**Problem** — Length of the longest substring with all unique characters. `"abcabcbb"` → 3 (`abc`). Sliding window / two pointers.

**Interview answer** — Window `[left, right]`. Move `right` across the string; if `s[right]` is already in the window, advance `left` past the previous occurrence. Track best length. A `Map<Character, Integer>` of last index (or `int[256]`) lets you jump `left` in O(1). This is the SDET III filter: you must explain the window invariant, not only the code.

**Code**

```java
static int lengthOfLongestSubstring(String s) {
    int[] last = new int[256];
    Arrays.fill(last, -1);
    int best = 0, left = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (last[c] >= left) left = last[c] + 1;  // c still in window
        last[c] = right;
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

**Complexity** — O(n) time, O(1) space for ASCII (`int[256]`); O(k) for a HashMap Unicode version.

**Follow-ups & traps**

- Trap: restarting the whole scan on each duplicate — O(n²).
- `"bbbb"` → 1; `""` → 0; `"pwwkew"` → 3 (`wke`).
- Variation: longest substring with at most K distinct (another window).
- `last[c] >= left` is the invariant: indices before `left` are stale and ignored.
- Draw `"pwwkew"` windows: this is the SDET III discriminator.
- HashMap version for Unicode: `Map<Character,Integer>` last index.


- Invariant: last[c] >= left means c is still in the window.
- Draw pwwkew if they doubt O(n).
- HashMap last-index for Unicode.

**Code**

```java
assert lengthOfLongestSubstring("abcabcbb") == 3;
assert lengthOfLongestSubstring("pwwkew") == 3;
```

**One-liner** — Sliding window; jump `left` to one past the last seen index of the new char — O(n), the SDET III string problem.

### Q16. LRU cache sketch or group-anagrams

**Problem A — Group anagrams.** Given `String[]`, group strings that are anagrams (`["eat","tea","tan","ate","nat","bat"]` → `[[eat,tea,ate],[tan,nat],[bat]]`).

**Problem B — LRU cache.** `get`/`put` in O(1); evict least-recently-used at capacity (collections Q16).

**Interview answer** — Group: key a map by the sorted character string (or a 26-count signature). LRU: `LinkedHashMap(capacity, 0.75f, true)` + `removeEldestEntry`, or HashMap + doubly linked list if they forbid LinkedHashMap. In a suite, LRU is a fixture cache; group-anagrams is the map-keying pattern behind "group failures by normalized message."

**Code**

```java
static List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new LinkedHashMap<>();
    for (String w : words) {
        char[] a = w.toCharArray();
        Arrays.sort(a);
        String key = new String(a);
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(w);
    }
    return new ArrayList<>(groups.values());
}

static String countKey(String w) {          // O(n) key, no sort
    int[] f = new int[26];
    for (int i = 0; i < w.length(); i++) f[w.charAt(i) - 'a']++;
    return Arrays.toString(f);
}

public final class LruCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> map;

    public LruCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > LruCache.this.capacity;
            }
        };
    }

    public synchronized V get(K key) { return map.get(key); }
    public synchronized void put(K key, V value) { map.put(key, value); }
}
```

**Complexity** — Group-anagrams: O(n * m log m) with sort keys, O(n * m) with count keys; space O(n m). LRU: O(1) get/put amortized.

**Follow-ups & traps**

- Anagram key must use the same normalization as Q2 (case).
- LRU `accessOrder` false is FIFO, not LRU.
- LRU not thread-safe unless you lock (parallel tests sharing a cache).
- Hand-rolled LRU: HashMap to nodes + dummy head/tail; interviewers may require this if they banned LinkedHashMap.

**One-liner** — Group anagrams by sorted-string (or count) keys; LRU is LinkedHashMap access-order plus `removeEldestEntry` — O(1) cache, O(n m log m) grouping.
