/**
 * Scaler-style DSA visualizer.
 * Exposes window.Viz and window.VizView. Works with DOM + optional App.go.
 */
(function (global) {
  'use strict';

  var KIND_CLASS = {
    active: 'is-active',
    left: 'is-left',
    right: 'is-right',
    ok: 'is-ok',
    bad: 'is-bad',
    window: 'is-window',
    pivot: 'is-pivot'
  };

  var lastSpeed = 1;
  var FALLBACK_CSS_ID = 'viz-fallback-css';

  /* ------------------------------------------------------------------ */
  /* DOM helpers                                                        */
  /* ------------------------------------------------------------------ */

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    var i, k, v;
    if (typeof attrs === 'string') {
      n.className = attrs;
    } else if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class' || k === 'className') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'value') n.value = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          n.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'dataset' && typeof v === 'object') {
          for (i in v) if (Object.prototype.hasOwnProperty.call(v, i)) n.dataset[i] = v[i];
        } else if (k === 'style' && typeof v === 'object') {
          for (i in v) if (Object.prototype.hasOwnProperty.call(v, i)) n.style[i] = v[i];
        } else if (v === true) {
          n.setAttribute(k, '');
        } else {
          n.setAttribute(k, String(v));
        }
      }
    }
    if (kids) {
      for (i = 0; i < kids.length; i++) {
        if (kids[i] == null) continue;
        n.appendChild(typeof kids[i] === 'string' || typeof kids[i] === 'number'
          ? document.createTextNode(String(kids[i]))
          : kids[i]);
      }
    }
    return n;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function go(hash) {
    var dest = hash.charAt(0) === '#' ? hash : '#' + hash;
    if (global.App && typeof global.App.go === 'function') {
      try { global.App.go(dest); return; } catch (e) { /* fall through */ }
    }
    if (global.location) global.location.hash = dest.replace(/^#/, '') ? dest : '#/';
  }

  /* ------------------------------------------------------------------ */
  /* Parsing                                                            */
  /* ------------------------------------------------------------------ */

  function parseInput(str) {
    if (str == null) return null;
    if (typeof str !== 'string') return str;
    var t = str.trim();
    if (!t) return null;
    try { return JSON.parse(t); } catch (e1) { /* try other forms */ }
    try { return JSON.parse('[' + t + ']'); } catch (e2) { /* csv */ }
    if (/^-?\d/.test(t) || t.indexOf(',') !== -1) {
      var parts = t.split(/[,\s]+/).filter(Boolean);
      if (parts.length && parts.every(function (p) {
        return p === 'null' || p === 'undefined' || !isNaN(Number(p));
      })) {
        return parts.map(function (p) {
          return p === 'null' || p === 'undefined' ? null : Number(p);
        });
      }
    }
    if ((t.charAt(0) === '"' && t.charAt(t.length - 1) === '"') ||
        (t.charAt(0) === "'" && t.charAt(t.length - 1) === "'")) {
      return t.slice(1, -1);
    }
    return t;
  }

  function asArray(input) {
    if (Array.isArray(input)) return input.slice();
    if (input && typeof input === 'object') {
      if (Array.isArray(input.nums)) return input.nums.slice();
      if (Array.isArray(input.arr)) return input.arr.slice();
      if (Array.isArray(input.array)) return input.array.slice();
      if (Array.isArray(input.height)) return input.height.slice();
      if (Array.isArray(input.intervals)) return input.intervals.slice();
      if (Array.isArray(input.grid)) return input.grid.slice();
    }
    if (typeof input === 'string') {
      var p = parseInput(input);
      if (p !== input) return asArray(p);
      return input.split('');
    }
    if (input == null) return [];
    return [input];
  }

  function asNums(input) {
    return asArray(input).map(function (v) {
      if (v == null || v === 'null') return null;
      var n = Number(v);
      return isNaN(n) ? v : n;
    });
  }

  function numsTarget(input, fallbackTarget) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      return {
        nums: asNums(input.nums != null ? input.nums : input.array),
        target: Number(input.target != null ? input.target : fallbackTarget)
      };
    }
    return { nums: asNums(input), target: Number(fallbackTarget) };
  }

  function numsK(input, fallbackK) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      return {
        nums: asNums(input.nums != null ? input.nums : input.array),
        k: Number(input.k != null ? input.k : fallbackK)
      };
    }
    return { nums: asNums(input), k: Number(fallbackK) };
  }

  function clone(v) {
    if (v == null || typeof v !== 'object') return v;
    if (typeof global.structuredClone === 'function') {
      try { return global.structuredClone(v); } catch (e) { /* slice */ }
    }
    return JSON.parse(JSON.stringify(v));
  }

  function rangeHi(lo, hi, kind) {
    var o = {};
    var i;
    for (i = lo; i <= hi; i++) o[i] = kind || 'window';
    return o;
  }

  function allHi(n, kind) {
    return rangeHi(0, n - 1, kind || 'ok');
  }

  function mergeHi() {
    var o = {};
    var a, i, k;
    for (a = 0; a < arguments.length; a++) {
      if (!arguments[a]) continue;
      for (k in arguments[a]) {
        if (Object.prototype.hasOwnProperty.call(arguments[a], k)) o[k] = arguments[a][k];
      }
    }
    return o;
  }

  function fmt(v) {
    if (v == null) return 'null';
    if (Array.isArray(v)) return '[' + v.join(', ') + ']';
    return String(v);
  }

  function mapCopy(m) {
    var o = {};
    var k;
    for (k in m) if (Object.prototype.hasOwnProperty.call(m, k)) o[k] = m[k];
    return o;
  }

  /* ------------------------------------------------------------------ */
  /* Step generators                                                    */
  /* ------------------------------------------------------------------ */

  function stepsReverseArray(input) {
    var arr = asNums(input);
    var steps = [];
    var n = arr.length;
    if (!n) {
      return [{ message: 'Empty array — nothing to reverse.', array: [] }];
    }
    var l = 0;
    var r = n - 1;
    steps.push({
      message: 'Two pointers start at the ends. Swap, then walk inward.',
      array: arr.slice(),
      pointers: { L: l, R: r },
      hi: mergeHi(rangeHi(l, l, 'left'), rangeHi(r, r, 'right')),
      extra: 'in-place reverse'
    });
    while (l < r) {
      steps.push({
        message: 'Swap ' + arr[l] + ' and ' + arr[r] + '.',
        array: arr.slice(),
        pointers: { L: l, R: r },
        hi: mergeHi(rangeHi(l, l, 'left'), rangeHi(r, r, 'right'))
      });
      var tmp = arr[l];
      arr[l] = arr[r];
      arr[r] = tmp;
      steps.push({
        message: 'After swap: ' + fmt(arr) + '.',
        array: arr.slice(),
        pointers: { L: l, R: r },
        hi: mergeHi(rangeHi(l, l, 'ok'), rangeHi(r, r, 'ok'))
      });
      l += 1;
      r -= 1;
      if (l <= r) {
        steps.push({
          message: 'Move L right and R left.',
          array: arr.slice(),
          pointers: { L: l, R: r },
          hi: mergeHi(rangeHi(l, l, 'left'), rangeHi(r, r, 'right'))
        });
      }
    }
    steps.push({
      message: 'Pointers met — the array is reversed.',
      array: arr.slice(),
      hi: allHi(n, 'ok'),
      extra: 'result = ' + fmt(arr)
    });
    return steps;
  }

  function stepsTwoSum(input) {
    var pair = numsTarget(input, 9);
    var nums = pair.nums;
    var target = pair.target;
    var map = {};
    var steps = [];
    steps.push({
      message: 'Find two indices whose values sum to ' + target + '.',
      array: nums.slice(),
      map: {},
      extra: 'target = ' + target
    });
    var i, need;
    for (i = 0; i < nums.length; i++) {
      need = target - nums[i];
      steps.push({
        message: 'i = ' + i + ', value ' + nums[i] + '. Complement is ' + need + '.',
        array: nums.slice(),
        pointers: { i: i },
        hi: rangeHi(i, i, 'active'),
        map: mapCopy(map),
        extra: 'need = ' + need
      });
      if (Object.prototype.hasOwnProperty.call(map, String(need))) {
        steps.push({
          message: 'Found ' + need + ' at index ' + map[need] + '. Pair (' + map[need] + ', ' + i + ').',
          array: nums.slice(),
          pointers: { i: i },
          hi: mergeHi(rangeHi(map[need], map[need], 'ok'), rangeHi(i, i, 'ok')),
          map: mapCopy(map),
          extra: 'answer = [' + map[need] + ', ' + i + ']'
        });
        return steps;
      }
      map[nums[i]] = i;
      steps.push({
        message: 'Store ' + nums[i] + ' -> ' + i + ' in the map.',
        array: nums.slice(),
        pointers: { i: i },
        hi: rangeHi(i, i, 'window'),
        map: mapCopy(map)
      });
    }
    steps.push({
      message: 'No pair sums to ' + target + '.',
      array: nums.slice(),
      map: mapCopy(map),
      extra: 'answer = []'
    });
    return steps;
  }

  function stepsBinarySearch(input) {
    var pair = numsTarget(input, 7);
    var nums = pair.nums;
    var target = pair.target;
    var steps = [];
    var lo = 0;
    var hi = nums.length - 1;
    steps.push({
      message: 'Binary search for ' + target + ' in a sorted array.',
      array: nums.slice(),
      pointers: nums.length ? { lo: lo, hi: hi } : {},
      extra: 'target = ' + target
    });
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var ptr = { lo: lo, mid: mid, hi: hi };
      var hiMap = mergeHi(
        rangeHi(lo, lo, 'left'),
        rangeHi(mid, mid, 'pivot'),
        rangeHi(hi, hi, 'right')
      );
      steps.push({
        message: 'lo = ' + lo + ', hi = ' + hi + ', mid = ' + mid + ', nums[mid] = ' + nums[mid] + '.',
        array: nums.slice(),
        pointers: ptr,
        hi: hiMap,
        extra: 'compare ' + nums[mid] + ' with ' + target
      });
      if (nums[mid] === target) {
        steps.push({
          message: 'Found ' + target + ' at index ' + mid + '.',
          array: nums.slice(),
          pointers: ptr,
          hi: rangeHi(mid, mid, 'ok'),
          extra: 'index = ' + mid
        });
        return steps;
      }
      if (nums[mid] < target) {
        lo = mid + 1;
        steps.push({
          message: nums[mid] + ' < ' + target + ' — discard the left half.',
          array: nums.slice(),
          pointers: lo <= hi ? { lo: lo, hi: hi } : {},
          hi: lo <= hi ? mergeHi(rangeHi(lo, lo, 'left'), rangeHi(hi, hi, 'right')) : {},
          extra: 'search [' + lo + ', ' + hi + ']'
        });
      } else {
        hi = mid - 1;
        steps.push({
          message: nums[mid] + ' > ' + target + ' — discard the right half.',
          array: nums.slice(),
          pointers: lo <= hi ? { lo: lo, hi: hi } : {},
          hi: lo <= hi ? mergeHi(rangeHi(lo, lo, 'left'), rangeHi(hi, hi, 'right')) : {},
          extra: 'search [' + lo + ', ' + hi + ']'
        });
      }
    }
    steps.push({
      message: target + ' is not in the array.',
      array: nums.slice(),
      extra: 'index = -1'
    });
    return steps;
  }

  function stepsSlidingWindow(input) {
    var pair = numsK(input, 3);
    var nums = pair.nums;
    var k = pair.k;
    var steps = [];
    if (k <= 0 || k > nums.length) {
      return [{
        message: 'Need 1 <= k <= n. Got k = ' + k + ', n = ' + nums.length + '.',
        array: nums.slice()
      }];
    }
    var sum = 0;
    var i;
    for (i = 0; i < k; i++) sum += nums[i];
    var best = sum;
    var bestL = 0;
    steps.push({
      message: 'Build the first window of size ' + k + '. Sum = ' + sum + '.',
      array: nums.slice(),
      pointers: { L: 0, R: k - 1 },
      hi: rangeHi(0, k - 1, 'window'),
      extra: 'best = ' + best
    });
    var r, l;
    for (r = k; r < nums.length; r++) {
      sum += nums[r] - nums[r - k];
      l = r - k + 1;
      steps.push({
        message: 'Slide: drop ' + nums[r - k] + ', add ' + nums[r] + '. Sum = ' + sum + '.',
        array: nums.slice(),
        pointers: { L: l, R: r },
        hi: rangeHi(l, r, 'window'),
        extra: 'best = ' + best + (sum > best ? '  candidate ' + sum : '')
      });
      if (sum > best) {
        best = sum;
        bestL = l;
        steps.push({
          message: 'New maximum window sum ' + best + '.',
          array: nums.slice(),
          pointers: { L: l, R: r },
          hi: rangeHi(l, r, 'ok'),
          extra: 'best = ' + best
        });
      }
    }
    steps.push({
      message: 'Maximum sum of any window of size ' + k + ' is ' + best + '.',
      array: nums.slice(),
      pointers: { L: bestL, R: bestL + k - 1 },
      hi: rangeHi(bestL, bestL + k - 1, 'ok'),
      extra: 'best = ' + best
    });
    return steps;
  }

  function stepsStackParens(input) {
    var s;
    if (typeof input === 'string') s = input;
    else if (input && typeof input === 'object' && input.s != null) s = String(input.s);
    else if (Array.isArray(input)) s = input.join('');
    else s = input == null ? '' : String(input);
    var pairs = { ')': '(', ']': '[', '}': '{' };
    var open = { '(': 1, '[': 1, '{': 1 };
    var arr = s.split('');
    var stack = [];
    var steps = [];
    steps.push({
      message: 'Push openers. A closer must match the top of the stack.',
      array: arr.slice(),
      stack: []
    });
    var i, c, top, ok;
    for (i = 0; i < arr.length; i++) {
      c = arr[i];
      if (open[c]) {
        stack.push(c);
        steps.push({
          message: 'Push \'' + c + '\'.',
          array: arr.slice(),
          pointers: { i: i },
          hi: rangeHi(i, i, 'active'),
          stack: stack.slice()
        });
      } else if (pairs[c]) {
        top = stack.length ? stack[stack.length - 1] : null;
        ok = top === pairs[c];
        steps.push({
          message: ok
            ? '\'' + c + '\' matches \'' + top + '\'. Pop.'
            : '\'' + c + '\' does not match ' + (top == null ? 'an empty stack' : '\'' + top + '\'') + '.',
          array: arr.slice(),
          pointers: { i: i },
          hi: rangeHi(i, i, ok ? 'ok' : 'bad'),
          stack: stack.slice()
        });
        if (!ok) {
          steps.push({
            message: 'Invalid parentheses.',
            array: arr.slice(),
            pointers: { i: i },
            hi: rangeHi(i, i, 'bad'),
            stack: stack.slice(),
            extra: 'valid = false'
          });
          return steps;
        }
        stack.pop();
        steps.push({
          message: 'Stack after pop.',
          array: arr.slice(),
          pointers: { i: i },
          hi: rangeHi(i, i, 'ok'),
          stack: stack.slice()
        });
      } else {
        steps.push({
          message: 'Skip unexpected character \'' + c + '\'.',
          array: arr.slice(),
          pointers: { i: i },
          hi: rangeHi(i, i, 'bad'),
          stack: stack.slice()
        });
      }
    }
    ok = stack.length === 0;
    steps.push({
      message: ok ? 'Stack empty — the string is valid.' : 'Stack still has openers — invalid.',
      array: arr.slice(),
      stack: stack.slice(),
      hi: ok ? allHi(arr.length, 'ok') : {},
      extra: 'valid = ' + ok
    });
    return steps;
  }

  function stepsMoveZeroes(input) {
    var arr = asNums(input);
    var steps = [];
    var write = 0;
    var i;
    steps.push({
      message: 'write is the next slot that should hold a non-zero.',
      array: arr.slice(),
      pointers: { write: 0 },
      extra: 'write = 0'
    });
    for (i = 0; i < arr.length; i++) {
      steps.push({
        message: 'i = ' + i + ', value ' + arr[i] + (arr[i] === 0 ? ' (zero — skip).' : '.'),
        array: arr.slice(),
        pointers: { i: i, write: write },
        hi: mergeHi(rangeHi(i, i, 'active'), rangeHi(write, write, 'left'))
      });
      if (arr[i] !== 0) {
        if (i !== write) {
          var tmp = arr[write];
          arr[write] = arr[i];
          arr[i] = tmp;
          steps.push({
            message: 'Swap non-zero into write = ' + write + '.',
            array: arr.slice(),
            pointers: { i: i, write: write },
            hi: mergeHi(rangeHi(write, write, 'ok'), rangeHi(i, i, 'window'))
          });
        } else {
          steps.push({
            message: 'Already in place at write = ' + write + '.',
            array: arr.slice(),
            pointers: { i: i, write: write },
            hi: rangeHi(write, write, 'ok')
          });
        }
        write += 1;
      }
    }
    steps.push({
      message: 'Non-zeros packed left; zeros fill the tail.',
      array: arr.slice(),
      hi: allHi(arr.length, 'ok'),
      extra: 'result = ' + fmt(arr)
    });
    return steps;
  }

  function stepsKadane(input) {
    var nums = asNums(input);
    var steps = [];
    if (!nums.length) return [{ message: 'Empty array.', array: [] }];
    var cur = nums[0];
    var best = nums[0];
    var curStart = 0;
    var bestL = 0;
    var bestR = 0;
    steps.push({
      message: 'Start at index 0. Current sum and best are both ' + nums[0] + '.',
      array: nums.slice(),
      pointers: { i: 0 },
      hi: rangeHi(0, 0, 'active'),
      extra: 'cur = ' + cur + '\nbest = ' + best
    });
    var i, extend, restart;
    for (i = 1; i < nums.length; i++) {
      extend = cur + nums[i];
      restart = nums[i];
      if (restart > extend) {
        cur = restart;
        curStart = i;
        steps.push({
          message: 'Restart at ' + nums[i] + ' (better than extending to ' + extend + ').',
          array: nums.slice(),
          pointers: { i: i },
          hi: rangeHi(i, i, 'pivot'),
          extra: 'cur = ' + cur + '\nbest = ' + best
        });
      } else {
        cur = extend;
        steps.push({
          message: 'Extend the current subarray. cur = ' + cur + '.',
          array: nums.slice(),
          pointers: { i: i },
          hi: rangeHi(curStart, i, 'window'),
          extra: 'cur = ' + cur + '\nbest = ' + best
        });
      }
      if (cur > best) {
        best = cur;
        bestL = curStart;
        bestR = i;
        steps.push({
          message: 'New best sum ' + best + ' on [' + bestL + ', ' + bestR + '].',
          array: nums.slice(),
          pointers: { i: i },
          hi: rangeHi(bestL, bestR, 'ok'),
          extra: 'cur = ' + cur + '\nbest = ' + best
        });
      }
    }
    steps.push({
      message: 'Maximum subarray sum is ' + best + '.',
      array: nums.slice(),
      hi: rangeHi(bestL, bestR, 'ok'),
      extra: 'best = ' + best + '\nrange = [' + bestL + ', ' + bestR + ']'
    });
    return steps;
  }

  function reverseRange(arr, l, r, steps, label) {
    steps.push({
      message: label,
      array: arr.slice(),
      pointers: l <= r ? { L: l, R: r } : {},
      hi: l <= r ? rangeHi(l, r, 'window') : {}
    });
    var a = l;
    var b = r;
    while (a < b) {
      var tmp = arr[a];
      arr[a] = arr[b];
      arr[b] = tmp;
      steps.push({
        message: 'Swap indices ' + a + ' and ' + b + '.',
        array: arr.slice(),
        pointers: { L: a, R: b },
        hi: mergeHi(rangeHi(a, a, 'left'), rangeHi(b, b, 'right'))
      });
      a += 1;
      b -= 1;
    }
  }

  function stepsRotateArray(input) {
    var pair = numsK(input, 3);
    var arr = pair.nums;
    var k = pair.k;
    var n = arr.length;
    var steps = [];
    if (!n) return [{ message: 'Empty array.', array: [] }];
    k = ((k % n) + n) % n;
    steps.push({
      message: 'Rotate right by ' + pair.k + ' (effective k = ' + k + '). Three reversals.',
      array: arr.slice(),
      extra: 'k = ' + k
    });
    if (k === 0) {
      steps.push({
        message: 'k is a multiple of n — the array is unchanged.',
        array: arr.slice(),
        hi: allHi(n, 'ok')
      });
      return steps;
    }
    reverseRange(arr, 0, n - 1, steps, 'Reverse the whole array.');
    reverseRange(arr, 0, k - 1, steps, 'Reverse the first k = ' + k + ' elements.');
    reverseRange(arr, k, n - 1, steps, 'Reverse the remaining suffix.');
    steps.push({
      message: 'Rotated: ' + fmt(arr) + '.',
      array: arr.slice(),
      hi: allHi(n, 'ok'),
      extra: 'result = ' + fmt(arr)
    });
    return steps;
  }

  function stepsHashFreq(input) {
    var a;
    var b;
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      a = String(input.a != null ? input.a : input.s != null ? input.s : '');
      b = String(input.b != null ? input.b : input.t != null ? input.t : '');
    } else if (Array.isArray(input) && input.length >= 2) {
      a = String(input[0]);
      b = String(input[1]);
    } else if (typeof input === 'string' && input.indexOf(' ') !== -1) {
      var bits = input.trim().split(/\s+/);
      a = bits[0] || '';
      b = bits[1] || '';
    } else {
      a = String(input == null ? '' : input);
      b = a;
    }
    var map = {};
    var steps = [];
    var arrA = a.split('');
    steps.push({
      message: 'Count letters in "' + a + '", then consume "' + b + '".',
      array: arrA.slice(),
      map: {},
      extra: 'anagram check'
    });
    var i, ch;
    for (i = 0; i < arrA.length; i++) {
      ch = arrA[i];
      map[ch] = (map[ch] || 0) + 1;
      steps.push({
        message: 'Count \'' + ch + '\' -> ' + map[ch] + '.',
        array: arrA.slice(),
        pointers: { i: i },
        hi: rangeHi(i, i, 'active'),
        map: mapCopy(map)
      });
    }
    var arrB = b.split('');
    for (i = 0; i < arrB.length; i++) {
      ch = arrB[i];
      if (!map[ch]) {
        steps.push({
          message: '\'' + ch + '\' is missing or already exhausted. Not anagrams.',
          array: arrB.slice(),
          pointers: { i: i },
          hi: rangeHi(i, i, 'bad'),
          map: mapCopy(map),
          extra: 'anagrams = false'
        });
        return steps;
      }
      map[ch] -= 1;
      steps.push({
        message: 'Consume \'' + ch + '\'. Remaining ' + map[ch] + '.',
        array: arrB.slice(),
        pointers: { i: i },
        hi: rangeHi(i, i, 'ok'),
        map: mapCopy(map)
      });
    }
    var leftover = Object.keys(map).filter(function (k) { return map[k] !== 0; });
    var ok = leftover.length === 0 && a.length === b.length;
    steps.push({
      message: ok ? 'All counts are zero — the strings are anagrams.' : 'Counts remain — not anagrams.',
      array: arrB.slice(),
      hi: ok ? allHi(arrB.length, 'ok') : {},
      map: mapCopy(map),
      extra: 'anagrams = ' + ok
    });
    return steps;
  }

  function stepsWater(input) {
    var hgt = asNums(input);
    var steps = [];
    var l = 0;
    var r = hgt.length - 1;
    var best = 0;
    var bestL = 0;
    var bestR = r;
    if (hgt.length < 2) {
      return [{ message: 'Need at least two lines.', bars: hgt.slice(), array: hgt.slice() }];
    }
    steps.push({
      message: 'Widest container first. Area = min(height[L], height[R]) * width.',
      bars: hgt.slice(),
      array: hgt.slice(),
      pointers: { L: l, R: r },
      hi: mergeHi(rangeHi(l, l, 'left'), rangeHi(r, r, 'right'))
    });
    while (l < r) {
      var width = r - l;
      var area = Math.min(hgt[l], hgt[r]) * width;
      var improved = area > best;
      if (improved) {
        best = area;
        bestL = l;
        bestR = r;
      }
      steps.push({
        message: 'min(' + hgt[l] + ', ' + hgt[r] + ') * ' + width + ' = ' + area + '.' +
          (improved ? ' New best.' : ''),
        bars: hgt.slice(),
        array: hgt.slice(),
        pointers: { L: l, R: r },
        hi: mergeHi(
          rangeHi(l, l, 'left'),
          rangeHi(r, r, 'right'),
          rangeHi(l + 1, r - 1, 'window')
        ),
        extra: 'area = ' + area + '\nbest = ' + best
      });
      if (hgt[l] < hgt[r]) {
        l += 1;
        steps.push({
          message: 'Left line is shorter — move L right.',
          bars: hgt.slice(),
          array: hgt.slice(),
          pointers: { L: l, R: r },
          hi: l < r ? mergeHi(rangeHi(l, l, 'left'), rangeHi(r, r, 'right')) : rangeHi(l, l, 'active'),
          extra: 'best = ' + best
        });
      } else {
        r -= 1;
        steps.push({
          message: 'Right line is shorter or equal — move R left.',
          bars: hgt.slice(),
          array: hgt.slice(),
          pointers: { L: l, R: r },
          hi: l < r ? mergeHi(rangeHi(l, l, 'left'), rangeHi(r, r, 'right')) : rangeHi(r, r, 'active'),
          extra: 'best = ' + best
        });
      }
    }
    steps.push({
      message: 'Maximum water is ' + best + '.',
      bars: hgt.slice(),
      array: hgt.slice(),
      pointers: { L: bestL, R: bestR },
      hi: mergeHi(rangeHi(bestL, bestL, 'ok'), rangeHi(bestR, bestR, 'ok')),
      extra: 'best = ' + best
    });
    return steps;
  }

  function stepsMergeIntervals(input) {
    var raw = asArray(input);
    var intervals = raw.map(function (iv) {
      if (Array.isArray(iv)) return [Number(iv[0]), Number(iv[1])];
      if (iv && typeof iv === 'object') return [Number(iv.start != null ? iv.start : iv[0]), Number(iv.end != null ? iv.end : iv[1])];
      return [Number(iv), Number(iv)];
    });
    var labels = function (list) {
      return list.map(function (iv) { return '[' + iv[0] + ', ' + iv[1] + ']'; });
    };
    var steps = [];
    if (!intervals.length) return [{ message: 'No intervals.', array: [] }];
    steps.push({
      message: 'Sort intervals by start, then merge overlaps.',
      array: labels(intervals)
    });
    intervals.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    steps.push({
      message: 'Sorted by start.',
      array: labels(intervals),
      extra: 'sorted'
    });
    var out = [[intervals[0][0], intervals[0][1]]];
    var i, last, cur;
    for (i = 1; i < intervals.length; i++) {
      last = out[out.length - 1];
      cur = intervals[i];
      steps.push({
        message: 'Compare ' + fmt(last) + ' with ' + fmt(cur) + '.',
        array: labels(intervals),
        pointers: { i: i },
        hi: mergeHi(rangeHi(i, i, 'active'), rangeHi(i - 1, i - 1, 'window')),
        extra: 'merged = ' + labels(out).join(' ')
      });
      if (cur[0] <= last[1]) {
        last[1] = Math.max(last[1], cur[1]);
        steps.push({
          message: 'Overlap — merge into ' + fmt(last) + '.',
          array: labels(intervals),
          pointers: { i: i },
          hi: rangeHi(i, i, 'ok'),
          extra: 'merged = ' + labels(out).join(' ')
        });
      } else {
        out.push([cur[0], cur[1]]);
        steps.push({
          message: 'No overlap — append ' + fmt(cur) + '.',
          array: labels(intervals),
          pointers: { i: i },
          hi: rangeHi(i, i, 'right'),
          extra: 'merged = ' + labels(out).join(' ')
        });
      }
    }
    steps.push({
      message: 'Merged intervals: ' + labels(out).join(', ') + '.',
      array: labels(out),
      hi: allHi(out.length, 'ok'),
      extra: 'result = ' + labels(out).join(' ')
    });
    return steps;
  }

  function isLand(v) {
    return v === 1 || v === '1' || v === true;
  }

  function stepsGridDfs(input) {
    var src = asArray(input);
    if (src.length && !Array.isArray(src[0]) && typeof src[0] !== 'string') {
      src = [src];
    }
    var grid = src.map(function (row) {
      if (typeof row === 'string') return row.split('');
      return asArray(row).slice();
    });
    var R = grid.length;
    var C = R ? grid[0].length : 0;
    var steps = [];
    var islands = 0;
    var seen = [];
    var r, c;
    for (r = 0; r < R; r++) {
      seen[r] = [];
      for (c = 0; c < C; c++) seen[r][c] = false;
    }

    function snap(msg, cr, cc, kind) {
      var gridHi = [];
      var rr, cc2;
      for (rr = 0; rr < R; rr++) {
        for (cc2 = 0; cc2 < C; cc2++) {
          if (cr === rr && cc === cc2) gridHi.push({ r: rr, c: cc2, kind: kind || 'active' });
          else if (seen[rr][cc2]) gridHi.push({ r: rr, c: cc2, kind: 'ok' });
        }
      }
      steps.push({
        message: msg,
        grid: grid.map(function (row) { return row.slice(); }),
        gridHi: gridHi,
        extra: 'islands = ' + islands
      });
    }

    function dfs(rr, cc) {
      if (rr < 0 || cc < 0 || rr >= R || cc >= C) return;
      if (!isLand(grid[rr][cc]) || seen[rr][cc]) return;
      seen[rr][cc] = true;
      grid[rr][cc] = typeof grid[rr][cc] === 'number' ? 0 : '0';
      snap('Visit (' + rr + ', ' + cc + ') and sink this land.', rr, cc, 'active');
      dfs(rr + 1, cc);
      dfs(rr - 1, cc);
      dfs(rr, cc + 1);
      dfs(rr, cc - 1);
    }

    snap('Scan the grid. Each unvisited land cell starts a new island.', -1, -1);
    for (r = 0; r < R; r++) {
      for (c = 0; c < C; c++) {
        if (isLand(grid[r][c]) && !seen[r][c]) {
          islands += 1;
          snap('New island #' + islands + ' at (' + r + ', ' + c + '). DFS flood-fill.', r, c, 'pivot');
          dfs(r, c);
        }
      }
    }
    snap('Number of islands: ' + islands + '.', -1, -1);
    if (steps.length) steps[steps.length - 1].extra = 'islands = ' + islands;
    return steps;
  }

  function stepsListReverse(input) {
    var vals = asNums(input).filter(function (v) { return v != null; });
    var n = vals.length;
    var links = [];
    var i;
    for (i = 0; i < n - 1; i++) links.push([i, i + 1]);
    var steps = [];
    if (!n) return [{ message: 'Empty list.', list: [], listLinks: [] }];

    function ptrs(prev, curr, next) {
      var p = {};
      if (prev != null) p.prev = prev;
      if (curr != null) p.curr = curr;
      if (next != null) p.next = next;
      return p;
    }

    function hiOf(prev, curr, next) {
      var o = {};
      if (prev != null) o[prev] = 'left';
      if (next != null) o[next] = 'right';
      if (curr != null) o[curr] = 'active';
      return o;
    }

    var prev = null;
    var curr = 0;
    steps.push({
      message: 'prev = null, curr = head.',
      list: vals.slice(),
      listLinks: links.map(function (x) { return x.slice(); }),
      pointers: ptrs(prev, curr, n > 1 ? 1 : null),
      hi: hiOf(prev, curr, n > 1 ? 1 : null),
      extra: 'prev = null'
    });
    while (curr != null) {
      var next = null;
      for (i = 0; i < links.length; i++) {
        if (links[i][0] === curr) { next = links[i][1]; break; }
      }
      steps.push({
        message: 'Save next' + (next == null ? ' (null)' : ' = ' + vals[next]) +
          '. Reverse ' + vals[curr] + ' so it points at ' + (prev == null ? 'null' : vals[prev]) + '.',
        list: vals.slice(),
        listLinks: links.map(function (x) { return x.slice(); }),
        pointers: ptrs(prev, curr, next),
        hi: hiOf(prev, curr, next)
      });
      links = links.filter(function (ln) { return ln[0] !== curr; });
      if (prev != null) links.push([curr, prev]);
      steps.push({
        message: 'Node ' + vals[curr] + ' now points to ' + (prev == null ? 'null' : vals[prev]) + '.',
        list: vals.slice(),
        listLinks: links.map(function (x) { return x.slice(); }),
        pointers: ptrs(prev, curr, next),
        hi: hiOf(prev, curr, next),
        extra: prev == null ? (vals[curr] + ' -> null') : (vals[curr] + ' -> ' + vals[prev])
      });
      prev = curr;
      curr = next;
    }
    steps.push({
      message: 'curr is null. prev = ' + vals[prev] + ' is the new head.',
      list: vals.slice(),
      listLinks: links.map(function (x) { return x.slice(); }),
      pointers: ptrs(prev, null, null),
      hi: allHi(n, 'ok'),
      extra: 'head = ' + vals[prev]
    });
    return steps;
  }

  function stepsLevelOrder(input) {
    var vals = asArray(input).map(function (v) {
      if (v == null || v === 'null') return null;
      var n = Number(v);
      return isNaN(n) ? v : n;
    });
    var show = vals.map(function (v) { return v == null ? 'null' : String(v); });
    var steps = [];
    var n = vals.length;
    steps.push({
      message: 'Tree stored as a level-order array. BFS with a queue.',
      array: show.slice(),
      extra: 'queue = []\nlevels = []'
    });
    if (!n || vals[0] == null) {
      steps.push({ message: 'Empty tree.', array: show.slice(), extra: 'levels = []' });
      return steps;
    }
    var queue = [0];
    var levels = [];
    while (queue.length) {
      var size = queue.length;
      var level = [];
      var levelIdx = [];
      steps.push({
        message: 'This level has ' + size + ' node' + (size === 1 ? '' : 's') + '. Queue holds the frontier.',
        array: show.slice(),
        hi: (function () {
          var o = {};
          queue.forEach(function (idx) { o[idx] = 'window'; });
          return o;
        })(),
        stack: queue.map(function (idx) { return vals[idx]; }),
        extra: 'queue = [' + queue.map(function (idx) { return vals[idx]; }).join(', ') + ']\nlevels = ' + JSON.stringify(levels)
      });
      var s, idx, L, R;
      for (s = 0; s < size; s++) {
        idx = queue.shift();
        level.push(vals[idx]);
        levelIdx.push(idx);
        L = 2 * idx + 1;
        R = 2 * idx + 2;
        if (L < n && vals[L] != null) queue.push(L);
        if (R < n && vals[R] != null) queue.push(R);
        steps.push({
          message: 'Dequeue ' + vals[idx] + '. Enqueue children' +
            (L < n && vals[L] != null ? ' ' + vals[L] : '') +
            (R < n && vals[R] != null ? ' ' + vals[R] : '') +
            (L >= n || (vals[L] == null && (R >= n || vals[R] == null)) ? ' (none)' : '') + '.',
          array: show.slice(),
          pointers: { i: idx },
          hi: rangeHi(idx, idx, 'active'),
          stack: queue.map(function (q) { return vals[q]; }),
          extra: 'queue = [' + queue.map(function (q) { return vals[q]; }).join(', ') + ']\nlevel = ' + fmt(level)
        });
      }
      levels.push(level);
      steps.push({
        message: 'Level complete: ' + fmt(level) + '.',
        array: show.slice(),
        hi: (function () {
          var o = {};
          levelIdx.forEach(function (t) { o[t] = 'ok'; });
          return o;
        })(),
        stack: queue.map(function (q) { return vals[q]; }),
        extra: 'levels = ' + JSON.stringify(levels)
      });
    }
    steps.push({
      message: 'Level order: ' + JSON.stringify(levels) + '.',
      array: show.slice(),
      extra: 'levels = ' + JSON.stringify(levels)
    });
    return steps;
  }

  /* ------------------------------------------------------------------ */
  /* Catalog                                                            */
  /* ------------------------------------------------------------------ */

  var ALGOS = [
    {
      id: 'reverse-array',
      name: 'Reverse Array',
      pattern: 'Two pointers',
      complexity: 'Time O(n) / Space O(1)',
      how: 'Two pointers start at the ends of the array. Swap the values they point at, then walk both inward. Stop when they meet or cross. The array is reversed in place with one pass and constant extra memory.',
      defaultInput: '[1,2,3,4,5]',
      generateSteps: stepsReverseArray
    },
    {
      id: 'two-sum',
      name: 'Two Sum',
      pattern: 'Hash map',
      complexity: 'Time O(n) / Space O(n)',
      how: 'Walk the array once. At each value, look up target minus that value in a hash map of numbers already seen. If the complement exists, those two indices are the answer. Otherwise store the current value and its index, then continue.',
      defaultInput: '{"nums":[2,7,11,15],"target":9}',
      generateSteps: stepsTwoSum
    },
    {
      id: 'binary-search',
      name: 'Binary Search',
      pattern: 'Divide and conquer',
      complexity: 'Time O(log n) / Space O(1)',
      how: 'Because the array is sorted, compare the target to the middle element and discard half the search space each step. Move lo right when mid is too small, or hi left when mid is too large. Stop when mid equals the target or the window is empty.',
      defaultInput: '{"nums":[1,3,5,7,9,11],"target":7}',
      generateSteps: stepsBinarySearch
    },
    {
      id: 'sliding-window',
      name: 'Max Sum of Window',
      pattern: 'Sliding window',
      complexity: 'Time O(n) / Space O(1)',
      how: 'A fixed window of size k holds a running sum. After the first window is built, slide one step at a time: drop the element that leaves and add the element that enters. Track the maximum sum seen. No nested loops are required.',
      defaultInput: '{"nums":[2,1,5,1,3,2],"k":3}',
      generateSteps: stepsSlidingWindow
    },
    {
      id: 'stack-parens',
      name: 'Valid Parentheses',
      pattern: 'Stack',
      complexity: 'Time O(n) / Space O(n)',
      how: 'Push opening brackets onto a stack. A closing bracket must match the current top; if it does, pop, otherwise the string is invalid. At the end the stack must be empty so every opener had a matching closer.',
      defaultInput: '"()[]{}"',
      generateSteps: stepsStackParens
    },
    {
      id: 'move-zeroes',
      name: 'Move Zeroes',
      pattern: 'Write index',
      complexity: 'Time O(n) / Space O(1)',
      how: 'Keep a write index at the next slot that should hold a non-zero. Scan with i; when nums[i] is non-zero, swap it into the write slot and advance write. Zeros naturally fill the tail and relative order of non-zeros is preserved.',
      defaultInput: '[0,1,0,3,12]',
      generateSteps: stepsMoveZeroes
    },
    {
      id: 'kadane',
      name: 'Maximum Subarray',
      pattern: 'Kadane',
      complexity: 'Time O(n) / Space O(1)',
      how: 'At each index decide whether to extend the current subarray or start a new one at this element — whichever sum is larger. Track the global maximum as you go. This finds the maximum-sum contiguous subarray in linear time.',
      defaultInput: '[-2,1,-3,4,-1,2,1,-5,4]',
      generateSteps: stepsKadane
    },
    {
      id: 'rotate-array',
      name: 'Rotate Array',
      pattern: 'Reverse-reverse',
      complexity: 'Time O(n) / Space O(1)',
      how: 'Rotating right by k equals three reversals: reverse the whole array, reverse the first k elements, then reverse the rest. Each reversal uses two pointers, so the rotation is in-place and does not need an extra buffer.',
      defaultInput: '{"nums":[1,2,3,4,5,6,7],"k":3}',
      generateSteps: stepsRotateArray
    },
    {
      id: 'hash-freq',
      name: 'Anagram Count',
      pattern: 'Hash frequency',
      complexity: 'Time O(n) / Space O(k)',
      how: 'Count every character of the first string in a hash map. Walk the second string and decrement those counts. The strings are anagrams if every count returns to zero and no character is missing or leftover. k is the alphabet size.',
      defaultInput: '{"a":"anagram","b":"nagaram"}',
      generateSteps: stepsHashFreq
    },
    {
      id: 'two-pointers-water',
      name: 'Container With Water',
      pattern: 'Two pointers',
      complexity: 'Time O(n) / Space O(1)',
      how: 'The widest container uses the two ends. Area is min(height[L], height[R]) times the width. Shrink from the shorter side because width only decreases, so the next candidate must improve height. Keep the best area seen.',
      defaultInput: '[1,8,6,2,5,4,8,3,7]',
      generateSteps: stepsWater
    },
    {
      id: 'merge-intervals',
      name: 'Merge Intervals',
      pattern: 'Sort and merge',
      complexity: 'Time O(n log n) / Space O(n)',
      how: 'Sort intervals by start time. Scan and merge into the last kept interval when the next start is at or before that end; otherwise append a new interval. The result is a disjoint, sorted list. Sorting dominates the running time.',
      defaultInput: '[[1,3],[2,6],[8,10],[15,18]]',
      generateSteps: stepsMergeIntervals
    },
    {
      id: 'grid-dfs',
      name: 'Number of Islands',
      pattern: 'Grid DFS',
      complexity: 'Time O(R*C) / Space O(R*C)',
      how: 'Every unvisited land cell starts a new island. DFS sinks that land and all 4-directionally connected land so those cells are not counted again. The number of times a new island is started is the answer. Each cell is visited a constant number of times.',
      defaultInput: '[["1","1","0"],["1","0","0"],["0","0","1"]]',
      generateSteps: stepsGridDfs
    },
    {
      id: 'linked-list-reverse',
      name: 'Reverse Linked List',
      pattern: 'prev / curr / next',
      complexity: 'Time O(n) / Space O(1)',
      how: 'Walk the list with three pointers. Save next, point curr at prev, then slide prev and curr forward. When curr is null, prev is the new head. The list is reversed in place without allocating new nodes.',
      defaultInput: '[1,2,3,4,5]',
      generateSteps: stepsListReverse
    },
    {
      id: 'level-order',
      name: 'Level Order Traversal',
      pattern: 'BFS queue',
      complexity: 'Time O(n) / Space O(n)',
      how: 'Breadth-first search with a queue. The queue size at the start of a round is the width of the current level. Dequeue that many nodes, record their values, and enqueue their non-null children. Repeat until the queue is empty.',
      defaultInput: '[3,9,20,null,null,15,7]',
      generateSteps: stepsLevelOrder
    }
  ];

  var ALGO_BY_ID = {};
  ALGOS.forEach(function (a) { ALGO_BY_ID[a.id] = a; });

  function findAlgo(id) {
    if (!id) return null;
    if (ALGO_BY_ID[id]) return ALGO_BY_ID[id];
    var key = String(id).toLowerCase();
    var i;
    for (i = 0; i < ALGOS.length; i++) {
      if (ALGOS[i].id === key || ALGOS[i].name.toLowerCase() === key) return ALGOS[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Renderer                                                           */
  /* ------------------------------------------------------------------ */

  function kindClass(kind) {
    return KIND_CLASS[kind] || (kind ? 'is-active' : '');
  }

  function cellEl(value, kind) {
    var cls = 'viz-cell viz-box' + (kind ? ' ' + kindClass(kind) : '');
    if (kind === 'active') cls += ' active';
    if (kind === 'ok') cls += ' done';
    var node = h('div', { className: cls, text: value == null ? '' : String(value) });
    return node;
  }

  function pointerNames(pointers, index) {
    if (!pointers) return '';
    var names = [];
    var k;
    for (k in pointers) {
      if (!Object.prototype.hasOwnProperty.call(pointers, k)) continue;
      if (Number(pointers[k]) === Number(index)) names.push(k);
    }
    return names.join(', ');
  }

  function drawArray(stage, arr, hi, pointers) {
    var row = h('div', 'viz-array');
    var ptrRow = h('div', 'viz-pointers');
    var i, kind, slot, names;
    for (i = 0; i < arr.length; i++) {
      kind = hi && hi[i];
      slot = h('div', 'viz-slot', [
        cellEl(arr[i], kind),
        h('div', { className: 'viz-idx', text: String(i) })
      ]);
      row.appendChild(slot);
      names = pointerNames(pointers, i);
      ptrRow.appendChild(h('div', { className: 'viz-pointer' + (names ? '' : ' is-empty'), text: names }));
    }
    stage.appendChild(row);
    if (pointers && arr.length) stage.appendChild(ptrRow);
  }

  function drawMap(stage, map) {
    var box = h('div', 'viz-map');
    var keys = Object.keys(map);
    if (!keys.length) {
      box.appendChild(h('span', { className: 'viz-chip is-empty', text: 'map empty' }));
    } else {
      keys.forEach(function (k) {
        box.appendChild(h('span', { className: 'viz-chip', text: k + ' -> ' + map[k] }));
      });
    }
    stage.appendChild(box);
  }

  function drawStack(stage, stack) {
    var box = h('div', 'viz-stack');
    box.appendChild(h('div', { className: 'viz-stack-label', text: 'top' }));
    var i;
    if (!stack.length) {
      box.appendChild(h('div', { className: 'viz-cell is-empty', text: '(empty)' }));
    }
    for (i = stack.length - 1; i >= 0; i--) {
      box.appendChild(cellEl(stack[i], i === stack.length - 1 ? 'active' : ''));
    }
    stage.appendChild(box);
  }

  function drawGrid(stage, grid, gridHi) {
    var mark = {};
    (gridHi || []).forEach(function (g) {
      mark[g.r + ',' + g.c] = g.kind;
    });
    var cols = grid[0] ? grid[0].length : 0;
    var wrap = h('div', {
      className: 'viz-grid',
      style: { gridTemplateColumns: 'repeat(' + cols + ', minmax(36px, 48px))' }
    });
    var r, c, kind;
    for (r = 0; r < grid.length; r++) {
      for (c = 0; c < grid[r].length; c++) {
        kind = mark[r + ',' + c];
        wrap.appendChild(cellEl(grid[r][c], kind));
      }
    }
    stage.appendChild(wrap);
  }

  function drawBars(stage, bars, hi, pointers) {
    var max = 1;
    bars.forEach(function (v) { if (Number(v) > max) max = Number(v); });
    var row = h('div', 'viz-bar-row');
    var ptrRow = h('div', 'viz-pointers');
    var i, hgt, kind, bar, names;
    for (i = 0; i < bars.length; i++) {
      hgt = Math.max(8, Math.round((Number(bars[i]) / max) * 140));
      kind = hi && hi[i];
      bar = h('div', {
        className: 'viz-bar' + (kind ? ' ' + kindClass(kind) : ''),
        style: { height: hgt + 'px' },
        text: String(bars[i])
      });
      row.appendChild(h('div', 'viz-bar-wrap', [bar]));
      names = pointerNames(pointers, i);
      ptrRow.appendChild(h('div', { className: 'viz-pointer' + (names ? '' : ' is-empty'), text: names }));
    }
    stage.appendChild(row);
    if (pointers) stage.appendChild(ptrRow);
  }

  function drawList(stage, list, listLinks, hi, pointers) {
    var nextOf = {};
    (listLinks || []).forEach(function (ln) { nextOf[ln[0]] = ln[1]; });
    var row = h('div', 'viz-list');
    var i, kind, wrap, names, nxt, arrow;
    for (i = 0; i < list.length; i++) {
      kind = hi && hi[i];
      wrap = h('div', 'viz-list-node');
      wrap.appendChild(cellEl(list[i], kind));
      names = pointerNames(pointers, i);
      wrap.appendChild(h('div', { className: 'viz-pointers', text: names || '\u00a0' }));
      row.appendChild(wrap);
      if (i < list.length - 1) {
        nxt = nextOf[i];
        if (nxt === i + 1) arrow = '->';
        else if (nextOf[i + 1] === i) arrow = '<-';
        else arrow = '  ';
        row.appendChild(h('div', { className: 'viz-list-arrow', text: arrow }));
      }
    }
    var dangling = [];
    for (i = 0; i < list.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(nextOf, i)) dangling.push(list[i] + ' -> null');
      else if (Math.abs(nextOf[i] - i) !== 1) dangling.push(list[i] + ' -> ' + list[nextOf[i]]);
    }
    stage.appendChild(row);
    if (dangling.length) {
      stage.appendChild(h('div', { className: 'viz-extra', text: dangling.join('   ') }));
    }
  }

  function draw(stage, step) {
    clear(stage);
    if (!step) {
      stage.appendChild(h('div', { className: 'viz-msg', text: 'No step.' }));
      return;
    }
    stage.appendChild(h('div', { className: 'viz-msg', text: step.message || '' }));
    var body = h('div', 'viz-body');
    var main = h('div', 'viz-main');
    var side = h('div', 'viz-side');
    if (step.array) drawArray(main, step.array, step.hi, step.pointers);
    if (step.bars) drawBars(main, step.bars, step.hi, step.pointers);
    if (step.grid) drawGrid(main, step.grid, step.gridHi);
    if (step.list) drawList(main, step.list, step.listLinks, step.hi, step.pointers);
    if (step.map) drawMap(side, step.map);
    if (step.stack) drawStack(side, step.stack);
    if (step.extra) side.appendChild(h('pre', { className: 'viz-extra', text: step.extra }));
    body.appendChild(main);
    if (side.childNodes.length) body.appendChild(side);
    stage.appendChild(body);
  }

  /* ------------------------------------------------------------------ */
  /* Player                                                             */
  /* ------------------------------------------------------------------ */

  function stopPlayer(root) {
    if (root && root._vizTimer) {
      clearInterval(root._vizTimer);
      root._vizTimer = null;
    }
  }

  function mountPlayer(root, steps, autoplay) {
    stopPlayer(root);
    clear(root);
    var stage = h('div', 'viz-stage');
    var controls = h('div', 'viz-controls');
    var idx = 0;
    var playing = false;
    var speed = lastSpeed || 1;

    function delay() {
      return Math.max(80, Math.round(900 / speed));
    }

    var btnPlay = h('button', { className: 'btn btn-primary', type: 'button', text: 'Play' });
    var btnPause = h('button', { className: 'btn', type: 'button', text: 'Pause' });
    var btnStep = h('button', { className: 'btn', type: 'button', text: 'Step' });
    var btnBack = h('button', { className: 'btn', type: 'button', text: 'Back' });
    var btnReset = h('button', { className: 'btn', type: 'button', text: 'Reset' });
    var slider = h('input', {
      type: 'range',
      min: '0.25',
      max: '4',
      step: '0.25',
      value: String(speed),
      title: 'Speed'
    });
    var speedLbl = h('span', { className: 'viz-speed', text: speed + 'x' });
    var counter = h('span', { className: 'viz-counter', text: '0 / 0' });

    function show(i) {
      idx = Math.max(0, Math.min(steps.length - 1, i));
      draw(stage, steps[idx] || { message: 'No steps.' });
      counter.textContent = (steps.length ? idx + 1 : 0) + ' / ' + steps.length;
      btnBack.disabled = idx <= 0;
      btnStep.disabled = idx >= steps.length - 1;
    }

    function pause() {
      playing = false;
      stopPlayer(root);
      btnPlay.disabled = false;
    }

    function play() {
      if (playing) return;
      if (idx >= steps.length - 1) show(0);
      playing = true;
      btnPlay.disabled = true;
      root._vizTimer = setInterval(function () {
        if (idx >= steps.length - 1) {
          pause();
          return;
        }
        show(idx + 1);
      }, delay());
    }

    btnPlay.addEventListener('click', play);
    btnPause.addEventListener('click', pause);
    btnStep.addEventListener('click', function () {
      pause();
      if (idx < steps.length - 1) show(idx + 1);
    });
    btnBack.addEventListener('click', function () {
      pause();
      if (idx > 0) show(idx - 1);
    });
    btnReset.addEventListener('click', function () {
      pause();
      show(0);
    });
    slider.addEventListener('input', function () {
      speed = Number(slider.value) || 1;
      lastSpeed = speed;
      speedLbl.textContent = speed + 'x';
      if (playing) {
        pause();
        play();
      }
    });

    controls.appendChild(btnPlay);
    controls.appendChild(btnPause);
    controls.appendChild(btnStep);
    controls.appendChild(btnBack);
    controls.appendChild(btnReset);
    controls.appendChild(h('label', { className: 'viz-speed-wrap' }, ['Speed ', slider, speedLbl]));
    controls.appendChild(counter);

    var wrap = h('div', 'viz-root');
    wrap.appendChild(stage);
    wrap.appendChild(controls);
    root.appendChild(wrap);
    show(0);
    if (autoplay && steps.length > 1) play();
    return { show: show, play: play, pause: pause };
  }

  function render(algoId, inputStr, opts) {
    opts = opts || {};
    var root = opts.root ||
      (global.document && (document.getElementById('viz-root') || document.querySelector('.viz-root')));
    if (!root) return null;
    ensureVizCss();
    var algo = findAlgo(algoId);
    var steps;
    if (!algo) {
      steps = [{ message: 'Unknown algorithm: ' + algoId }];
      return mountPlayer(root, steps, false);
    }
    try {
      var raw = (inputStr == null || String(inputStr).trim() === '') ? algo.defaultInput : inputStr;
      var parsed = parseInput(raw);
      steps = algo.generateSteps(parsed);
    } catch (err) {
      steps = [{ message: 'Could not run visualizer: ' + (err && err.message ? err.message : err) }];
    }
    if (!steps || !steps.length) steps = [{ message: 'No steps generated.' }];
    return mountPlayer(root, steps, !!opts.autoplay);
  }

  /* ------------------------------------------------------------------ */
  /* Lab page                                                           */
  /* ------------------------------------------------------------------ */

  function isNode(x) {
    return !!(x && typeof x === 'object' && x.nodeType === 1 && typeof x.appendChild === 'function');
  }

  function algoIdFromRoute(route) {
    if (isNode(route)) {
      return algoIdFromRoute(global.location && location.hash);
    }
    if (route == null || route === '') {
      if (global.location && location.hash) route = location.hash;
      else return '';
    }
    if (typeof route === 'object') {
      return route.algo || route.viz || route.id ||
        (route.params && (route.params.algo || route.params.viz || route.params.id)) ||
        (route.parts && route.parts[1]) ||
        algoIdFromRoute(route.path || route.hash || route.route || '');
    }
    var s = String(route).replace(/^#\/?/, '');
    var parts = s.split('/').filter(Boolean);
    if (parts[0] === 'visualize' || parts[0] === 'viz' || parts[0] === 'visualizer') {
      return parts[1] || '';
    }
    if (findAlgo(parts[0])) return parts[0];
    return parts[1] || '';
  }

  function lab(routeOrEl, maybeRoute) {
    ensureVizCss();
    var mount = isNode(routeOrEl) ? routeOrEl : null;
    var route = mount ? (maybeRoute != null ? maybeRoute : routeOrEl) : routeOrEl;
    var root = h('div', 'viz-lab');
    var selected = algoIdFromRoute(route);

    function paint(id) {
      selected = id || '';
      clear(root);
      root.appendChild(h('header', 'viz-lab-head', [
        h('p', { className: 'pill', text: 'Visualizer' }),
        h('h1', { text: 'Visualize' }),
        h('p', { className: 'lede', text: 'Pick an algorithm, feed it input, and step through every move — the same patterns that show up in coding interviews.' })
      ]));

      var picker = h('div', 'viz-picker');
      ALGOS.forEach(function (algo) {
        var card = h('button', {
          type: 'button',
          className: 'card viz-pick' + (algo.id === selected ? ' is-selected' : ''),
          dataset: { id: algo.id }
        }, [
          h('strong', { text: algo.name }),
          h('span', { className: 'muted', text: algo.pattern })
        ]);
        card.addEventListener('click', function () {
          go('#/visualize/' + algo.id);
          paint(algo.id);
        });
        picker.appendChild(card);
      });
      root.appendChild(picker);

      var algo = findAlgo(selected);
      if (!algo) {
        root.appendChild(h('p', { className: 'empty-state', text: 'Choose an algorithm to open the stage.' }));
        return;
      }

      var workspace = h('section', 'viz-workspace');
      workspace.appendChild(h('h2', { text: algo.name }));
      workspace.appendChild(h('p', { className: 'viz-pattern', text: algo.pattern }));
      workspace.appendChild(h('p', { className: 'viz-complexity', text: algo.complexity }));

      var ta = h('textarea', {
        className: 'viz-input',
        rows: 4,
        spellcheck: 'false',
        value: algo.defaultInput
      });
      ta.value = algo.defaultInput;
      var runBtn = h('button', { type: 'button', className: 'btn btn-primary', text: 'Visualize' });
      var stageRoot = h('div', 'viz-mount');
      runBtn.addEventListener('click', function () {
        render(algo.id, ta.value, { root: stageRoot, autoplay: true });
      });

      workspace.appendChild(h('label', { className: 'viz-label', text: 'Input (JSON or CSV numbers)' }));
      workspace.appendChild(ta);
      workspace.appendChild(h('div', 'viz-actions', [runBtn]));
      workspace.appendChild(stageRoot);

      workspace.appendChild(h('div', 'viz-how card', [
        h('h3', { text: 'How it works' }),
        h('p', { text: algo.how }),
        h('p', { className: 'viz-complexity', text: algo.complexity })
      ]));

      root.appendChild(workspace);
      render(algo.id, ta.value, { root: stageRoot, autoplay: false });
    }

    paint(selected);
    if (mount) {
      clear(mount);
      mount.appendChild(root);
      return mount;
    }
    return root;
  }

  /* ------------------------------------------------------------------ */
  /* Fallback CSS so the file works without app.css                     */
  /* ------------------------------------------------------------------ */

  var FALLBACK_CSS = [
    '.viz-lab{max-width:1100px}',
    '.viz-lab-head h1{margin:8px 0}',
    '.viz-picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:20px 0 28px}',
    '.viz-pick{display:flex;flex-direction:column;gap:6px;text-align:left;cursor:pointer;background:inherit;color:inherit;width:100%}',
    '.viz-pick.is-selected{border-color:#f46a1f;box-shadow:0 0 0 1px rgba(244,106,31,.45)}',
    '.viz-pick .muted,.viz-pattern{color:#93a0b8;font-size:13px}',
    '.viz-complexity{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#7c9cff}',
    '.viz-workspace{display:flex;flex-direction:column;gap:10px}',
    '.viz-label{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#93a0b8}',
    '.viz-input{width:100%;min-height:84px;padding:10px 12px;border-radius:10px;border:1px solid #2a3550;background:#0e1526;color:#e8eefc;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;resize:vertical}',
    '.viz-actions{display:flex;gap:8px}',
    '.viz-root,.viz-mount .viz-root{border:1px solid #2a3550;border-radius:14px;background:#0e1526;overflow:hidden}',
    '.viz-stage{min-height:200px;padding:18px;background:linear-gradient(180deg,#10182a,#0c1322)}',
    '.viz-msg{margin-bottom:14px;padding:10px 12px;border-radius:10px;border:1px solid #2a3550;background:#141c2e;color:#e8eefc;font-size:14px}',
    '.viz-body{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}',
    '.viz-main{flex:1 1 280px;min-width:0}',
    '.viz-side{flex:0 0 180px;display:flex;flex-direction:column;gap:12px}',
    '.viz-array,.viz-pointers,.viz-bar-row{display:flex;gap:8px;justify-content:center;align-items:flex-end}',
    '.viz-slot,.viz-bar-wrap{display:flex;flex-direction:column;align-items:center;min-width:42px}',
    '.viz-cell,.viz-box{min-width:42px;height:42px;display:grid;place-items:center;border-radius:8px;border:1px solid #3a4a6e;background:#1a243a;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#e8eefc}',
    '.viz-cell.is-active,.viz-cell.active,.is-active{border-color:#f46a1f;background:rgba(244,106,31,.18);color:#ffd7bf}',
    '.viz-cell.is-left,.is-left{border-color:#7c9cff;background:rgba(124,156,255,.16)}',
    '.viz-cell.is-right,.is-right{border-color:#fbbf24;background:rgba(251,191,36,.14)}',
    '.viz-cell.is-ok,.viz-cell.done,.is-ok{border-color:#34d399;background:rgba(52,211,153,.14)}',
    '.viz-cell.is-bad,.is-bad{border-color:#f87171;background:rgba(248,113,113,.16)}',
    '.viz-cell.is-window,.is-window{border-color:#a78bfa;background:rgba(167,139,250,.16)}',
    '.viz-cell.is-pivot,.is-pivot{border-color:#f46a1f;box-shadow:0 0 0 2px rgba(244,106,31,.35)}',
    '.viz-idx{font-size:10px;color:#93a0b8;margin-top:4px;font-family:ui-monospace,Menlo,Consolas,monospace}',
    '.viz-pointers{margin-top:4px;min-height:16px}',
    '.viz-pointer{min-width:42px;text-align:center;font-size:11px;font-family:ui-monospace,Menlo,Consolas,monospace;color:#7c9cff}',
    '.viz-map{display:flex;flex-wrap:wrap;gap:8px}',
    '.viz-chip{padding:4px 8px;border-radius:99px;border:1px solid #2a3550;background:#1a2336;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}',
    '.viz-stack{display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:72px}',
    '.viz-stack-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#93a0b8}',
    '.viz-grid{display:grid;gap:6px;justify-content:center}',
    '.viz-bar-row{align-items:flex-end;min-height:160px}',
    '.viz-bar{min-width:28px;width:36px;border-radius:6px 6px 0 0;border:1px solid #3a4a6e;background:#1a243a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#e8eefc}',
    '.viz-bar.is-left{border-color:#7c9cff;background:rgba(124,156,255,.35)}',
    '.viz-bar.is-right{border-color:#fbbf24;background:rgba(251,191,36,.35)}',
    '.viz-bar.is-window{border-color:#a78bfa;background:rgba(167,139,250,.22)}',
    '.viz-bar.is-ok{border-color:#34d399;background:rgba(52,211,153,.3)}',
    '.viz-bar.is-active{border-color:#f46a1f;background:rgba(244,106,31,.35)}',
    '.viz-list{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap}',
    '.viz-list-node{display:flex;flex-direction:column;align-items:center}',
    '.viz-list-arrow{font-family:ui-monospace,Menlo,Consolas,monospace;color:#7c9cff;min-width:20px;text-align:center}',
    '.viz-extra{margin:0;padding:10px 12px;border-radius:10px;border:1px solid #2a3550;background:#121a2c;color:#c9d4ea;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap}',
    '.viz-controls{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 12px;border-top:1px solid #2a3550;background:#121a2c}',
    '.viz-speed-wrap{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#93a0b8}',
    '.viz-counter{margin-left:auto;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#93a0b8}',
    '.viz-how h3{margin:0 0 8px;font-size:15px}',
    '.viz-how p{margin:0 0 8px;color:#c9d4ea}'
  ].join('\n');

  function ensureVizCss() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(FALLBACK_CSS_ID)) return;
    var hasCell = false;
    try {
      var sheets = document.styleSheets;
      var i, j, rules, sel;
      for (i = 0; i < sheets.length; i++) {
        try { rules = sheets[i].cssRules; } catch (err) { continue; }
        if (!rules) continue;
        for (j = 0; j < rules.length; j++) {
          sel = rules[j].selectorText || '';
          if (sel.indexOf('.viz-cell') !== -1) { hasCell = true; break; }
        }
        if (hasCell) break;
      }
    } catch (e) { /* inject anyway */ }
    if (hasCell) return;
    var style = document.createElement('style');
    style.id = FALLBACK_CSS_ID;
    style.textContent = FALLBACK_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */

  var Viz = {
    algos: ALGOS,
    render: render,
    lab: lab,
    parseInput: parseInput,
    draw: draw
  };

  global.Viz = Viz;
  global.VizView = function (route, maybeRoute) { return Viz.lab(route, maybeRoute); };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureVizCss);
    } else {
      ensureVizCss();
    }
  }
})(typeof window !== 'undefined' ? window : this);
