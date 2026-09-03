/* Academy practice engine: hub, problem runner, compiler, viz lab. */
(function (global) {
  'use strict';

  var MONACO_VS = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';
  var PISTON_URL = 'https://emkc.org/api/v2/piston/execute';
  var PISTON_VERSIONS = { java: '15.0.2', javascript: '18.15.0', python: '3.10.0' };
  var editorInstance = null;
  var fallbackArea = null;
  var monacoLoading = false;
  var monacoQueue = [];
  var hubState = { q: '', difficulty: 'all', topic: 'all', pattern: 'all' };
  var problemDrafts = {};
  var currentLang = 'java';
  var lastProblemId = null;
  var STYLE_ID = 'practice-engine-css';

  var COMPILER_SAMPLES = {
    java:
      'public class Main {\n' +
      '    public static void main(String[] args) {\n' +
      '        System.out.println("hello from Java");\n' +
      '    }\n' +
      '}\n',
    javascript: 'console.log("hello from JavaScript");\n',
    python: 'print("hello from Python")\n'
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getMount() {
    var ids = ['view', 'app-view', 'content', 'app', 'main'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) return el;
    }
    var wrap = document.getElementById('academy-view');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'academy-view';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function normalizeArgs(a, b) {
    if (a && a.nodeType === 1) {
      return { mount: a, route: b || {} };
    }
    return { mount: getMount(), route: a || {} };
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement('style');
    css.id = STYLE_ID;
    css.textContent =
      '.pe-wrap{font-family:ui-sans-serif,system-ui,sans-serif;color:var(--ink,#1c1917);max-width:1200px;margin:0 auto;padding:16px 18px 64px;}' +
      '.pe-h1{font-size:26px;margin:0 0 8px;}' +
      '.pe-lead{color:var(--muted,#57534e);margin:0 0 16px;}' +
      '.pe-search{width:100%;max-width:420px;padding:8px 12px;border:1px solid var(--line,#e7e0d6);border-radius:8px;font-size:14px;}' +
      '.pe-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;}' +
      '.pe-chip{border:1px solid var(--line,#e7e0d6);background:#fff;border-radius:999px;padding:4px 10px;font-size:12px;cursor:pointer;}' +
      '.pe-chip.is-on{background:var(--accent,#1d4ed8);color:#fff;border-color:transparent;}' +
      '.pe-chip.easy{outline-color:#166534;}' +
      '.pe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:14px;}' +
      '.pe-card{display:block;text-decoration:none;color:inherit;background:var(--paper,#fffcf7);border:1px solid var(--line,#e7e0d6);border-radius:10px;padding:12px 14px;}' +
      '.pe-card:hover{border-color:var(--accent,#1d4ed8);}' +
      '.pe-card h3{margin:0 0 6px;font-size:15px;}' +
      '.pe-meta{font-size:12px;color:var(--muted,#57534e);}' +
      '.pe-badge{display:inline-block;font-size:10px;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:4px;margin-right:6px;}' +
      '.pe-badge.easy{background:#dcfce7;color:#166534;}' +
      '.pe-badge.medium{background:#fef3c7;color:#92400e;}' +
      '.pe-badge.hard{background:#fee2e2;color:#991b1b;}' +
      '.pe-badge.solved{background:#dbeafe;color:#1d4ed8;}' +
      '.pe-split{display:grid;grid-template-columns:minmax(260px,1fr) minmax(340px,1.2fr);gap:16px;}' +
      '@media(max-width:900px){.pe-split{grid-template-columns:1fr;}}' +
      '.pe-panel{background:var(--paper,#fffcf7);border:1px solid var(--line,#e7e0d6);border-radius:10px;padding:14px;}' +
      '.pe-prompt{white-space:pre-wrap;line-height:1.55;margin:0 0 10px;}' +
      '.pe-sig{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;overflow:auto;}' +
      '.pe-tests{margin:8px 0 0;padding-left:18px;font-size:13px;}' +
      '.pe-actions,.pe-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;}' +
      '.pe-btn{border:0;border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;background:var(--accent,#1d4ed8);color:#fff;}' +
      '.pe-btn.ghost{background:#e7e0d6;color:#1c1917;}' +
      '.pe-lang button{border:1px solid var(--line,#e7e0d6);background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;}' +
      '.pe-lang button.is-on{background:#1e293b;color:#fff;}' +
      '#monaco-editor,.pe-editor{height:420px;border-radius:8px;overflow:hidden;border:1px solid #334155;}' +
      'textarea.editor-fallback{width:100%;height:420px;background:#1e293b;color:#e2e8f0;border:0;padding:12px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;}' +
      '#console,.pe-console{background:#0f172a;color:#e2e8f0;min-height:120px;max-height:280px;overflow:auto;padding:10px 12px;border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap;}' +
      '.pe-pass{color:#86efac;}' +
      '.pe-fail{color:#fca5a5;}' +
      '.pe-hint,.pe-sol{background:#fff;border:1px dashed var(--line,#e7e0d6);padding:8px 10px;margin-top:8px;font-size:13px;}' +
      '.pe-sol pre{margin:0;white-space:pre-wrap;}' +
      '.pe-viz input{width:100%;padding:6px 8px;margin:6px 0 8px;border:1px solid var(--line,#e7e0d6);border-radius:6px;}' +
      '.pe-back{font-size:13px;color:var(--accent,#1d4ed8);text-decoration:none;display:inline-block;margin-bottom:10px;}' +
      '.pe-hidden{display:none;}' +
      '.pe-table{width:100%;border-collapse:collapse;font-size:14px;}' +
      '.pe-table th,.pe-table td{border:1px solid var(--line,#e7e0d6);padding:8px 10px;text-align:left;}' +
      '.pe-table th{background:#efeae2;font-size:12px;}';
    document.head.appendChild(css);
  }

  function disposeEditor() {
    if (editorInstance && typeof editorInstance.dispose === 'function') {
      try { editorInstance.dispose(); } catch (e) {}
    }
    editorInstance = null;
    fallbackArea = null;
  }

  function loadMonaco(cb) {
    if (global.monaco && global.monaco.editor) {
      cb(global.monaco);
      return;
    }
    monacoQueue.push(cb);
    if (monacoLoading) return;
    monacoLoading = true;
    function boot() {
      try {
        global.require.config({ paths: { vs: MONACO_VS } });
        global.require(['vs/editor/editor.main'], function () {
          monacoLoading = false;
          var m = global.monaco;
          var q = monacoQueue.slice();
          monacoQueue = [];
          for (var i = 0; i < q.length; i++) q[i](m);
        });
      } catch (err) {
        monacoLoading = false;
        var q2 = monacoQueue.slice();
        monacoQueue = [];
        for (var j = 0; j < q2.length; j++) q2[j](null);
      }
    }
    if (typeof global.require === 'function' && typeof global.require.config === 'function') {
      boot();
      return;
    }
    var s = document.createElement('script');
    s.src = MONACO_VS + '/loader.min.js';
    s.onload = boot;
    s.onerror = function () {
      monacoLoading = false;
      var q = monacoQueue.slice();
      monacoQueue = [];
      for (var i = 0; i < q.length; i++) q[i](null);
    };
    document.head.appendChild(s);
  }

  function monacoLanguage(lang) {
    if (lang === 'javascript') return 'javascript';
    if (lang === 'python') return 'python';
    return 'java';
  }

  function mountFallback(container, value) {
    container.innerHTML = '';
    var ta = document.createElement('textarea');
    ta.className = 'editor-fallback';
    ta.value = value || '';
    ta.setAttribute('spellcheck', 'false');
    container.appendChild(ta);
    fallbackArea = ta;
    return ta;
  }

  function mountEditor(container, value, lang) {
    disposeEditor();
    if (!container) return;
    var ta = mountFallback(container, value);
    loadMonaco(function (monaco) {
      if (!document.body.contains(container)) return;
      if (!monaco) return;
      var current = fallbackArea ? fallbackArea.value : value;
      container.innerHTML = '';
      fallbackArea = null;
      editorInstance = monaco.editor.create(container, {
        value: current || '',
        language: monacoLanguage(lang),
        theme: 'vs-dark',
        fontSize: 14,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false
      });
    });
    return ta;
  }

  function getEditorValue() {
    if (editorInstance) return editorInstance.getValue();
    if (fallbackArea) return fallbackArea.value;
    var ta = document.querySelector('#monaco-editor textarea.editor-fallback, textarea.editor-fallback');
    return ta ? ta.value : '';
  }

  function setEditorValue(value, lang) {
    if (editorInstance) {
      editorInstance.setValue(value || '');
      var monaco = global.monaco;
      if (monaco && editorInstance.getModel()) {
        monaco.editor.setModelLanguage(editorInstance.getModel(), monacoLanguage(lang));
      }
      return;
    }
    if (fallbackArea) fallbackArea.value = value || '';
  }

  function progressApi() {
    return global.Progress || global.AcademyProgress || null;
  }

  function isSolved(id) {
    var P = progressApi();
    if (P) {
      if (typeof P.isSolved === 'function') return !!P.isSolved(id);
      if (typeof P.has === 'function') return !!P.has(id);
      if (typeof P.solved === 'function') return !!P.solved(id);
      if (P.solved) {
        if (typeof P.solved.has === 'function') return P.solved.has(id);
        if (Array.isArray(P.solved)) return P.solved.indexOf(id) >= 0;
        if (typeof P.solved === 'object') return !!P.solved[id];
      }
    }
    try {
      var raw = JSON.parse(localStorage.getItem('academy.progress') || '{}');
      var solved = raw.solved || {};
      if (Array.isArray(solved)) return solved.indexOf(id) >= 0;
      return !!solved[id];
    } catch (e) {
      return false;
    }
  }

  function markSolved(id) {
    var P = progressApi();
    if (P) {
      if (typeof P.markSolved === 'function') { P.markSolved(id); return; }
      if (typeof P.solve === 'function') { P.solve(id); return; }
      if (typeof P.setSolved === 'function') { P.setSolved(id, true); return; }
    }
    try {
      var raw = JSON.parse(localStorage.getItem('academy.progress') || '{}');
      if (!raw.solved || Array.isArray(raw.solved)) raw.solved = raw.solved && !Array.isArray(raw.solved) ? raw.solved : {};
      if (Array.isArray(raw.solved)) {
        var o = {};
        for (var i = 0; i < raw.solved.length; i++) o[raw.solved[i]] = true;
        raw.solved = o;
      }
      raw.solved[id] = true;
      localStorage.setItem('academy.progress', JSON.stringify(raw));
    } catch (e) {}
  }

  function parseProblemId(route) {
    function fromPath(path) {
      var h = String(path || '').replace(/^#\/?/, '');
      var parts = h.split('/').filter(Boolean);
      if (parts[0] === 'practice' && parts[1]) return decodeURIComponent(parts[1]);
      return null;
    }
    if (route == null || route === '') {
      return fromPath(location.hash || '');
    }
    if (typeof route === 'string') {
      if (route.indexOf('/') === -1 && route !== 'practice' && route !== 'compiler' && route !== 'viz') {
        return route;
      }
      return fromPath(route);
    }
    if (route.id) return route.id;
    if (route.problemId) return route.problemId;
    if (route.params && (route.params.id || route.params.problemId)) {
      return route.params.id || route.params.problemId;
    }
    return fromPath(route.path || route.hash || route.route || location.hash || '');
  }

  function problemList() {
    return (global.Problems && Array.isArray(Problems.list)) ? Problems.list : [];
  }

  function uniqueField(field) {
    var seen = {};
    var out = [];
    var list = problemList();
    for (var i = 0; i < list.length; i++) {
      var v = list[i][field];
      if (v && !seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    }
    out.sort();
    return out;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function checkTwoSumIndices(actual, args) {
    var nums = args[0];
    var target = args[1];
    if (!actual || actual.length !== 2) return false;
    var i = actual[0];
    var j = actual[1];
    if (i === j || i < 0 || j < 0 || i >= nums.length || j >= nums.length) return false;
    return nums[i] + nums[j] === target;
  }

  function normalizeAnyOrder(v) {
    if (!Array.isArray(v)) return JSON.stringify(v);
    var mapped = v.map(function (item) {
      if (Array.isArray(item)) {
        var inner = item.slice();
        var primitives = inner.every(function (x) {
          return x == null || typeof x !== 'object';
        });
        if (primitives) {
          inner.sort(function (p, q) {
            if (typeof p === 'number' && typeof q === 'number') return p - q;
            return String(p).localeCompare(String(q));
          });
        }
        return JSON.stringify(inner);
      }
      return JSON.stringify(item);
    });
    mapped.sort();
    return mapped.join('|');
  }

  function compareCheck(check, actual, expect, args) {
    if (check === 'twoSumIndices') return checkTwoSumIndices(actual, args);
    if (check === 'boolean') return !!actual === !!expect && typeof actual !== 'undefined';
    if (check === 'number') return Number(actual) === Number(expect);
    if (check === 'inPlaceArray') return deepEqual(actual, expect);
    if (check === 'anyOrderArray') return normalizeAnyOrder(actual) === normalizeAnyOrder(expect);
    return deepEqual(actual, expect);
  }

  function arrayToList(arr) {
    if (!arr || !arr.length) return null;
    var dummy = { val: 0, next: null };
    var t = dummy;
    for (var i = 0; i < arr.length; i++) {
      t.next = { val: arr[i], next: null };
      t = t.next;
    }
    return dummy.next;
  }

  function listToArray(head) {
    var out = [];
    var c = head;
    var guard = 0;
    while (c && guard++ < 10000) {
      out.push(c.val);
      c = c.next;
    }
    return out;
  }

  function runLruOps(Cache, args) {
    var capacity = args[0];
    var ops = args[1] || [];
    var cache = new Cache(capacity);
    var out = [];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op[0] === 'put') cache.put(op[1], op[2]);
      else if (op[0] === 'get') out.push(cache.get(op[1]));
    }
    return out;
  }

  function formatVal(v) {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  function runJsTests(problem, userCode) {
    var logs = [];
    var fnName = problem.fn;
    var passed = 0;
    var failed = 0;
    var prints = [];
    var fakeConsole = {
      log: function () { prints.push(Array.prototype.slice.call(arguments).map(String).join(' ')); },
      error: function () { prints.push('ERR ' + Array.prototype.slice.call(arguments).join(' ')); },
      warn: function () { prints.push(Array.prototype.slice.call(arguments).join(' ')); }
    };
    var impl;
    try {
      var body = '"use strict";\n' + userCode + '\n; return (typeof ' + fnName + ' !== "undefined") ? ' + fnName + ' : undefined;';
      impl = new Function('console', body)(fakeConsole);
    } catch (err) {
      logs.push('Eval error: ' + (err && err.message ? err.message : String(err)));
      return { logs: logs, passed: 0, failed: (problem.tests || []).length, ok: false };
    }
    if (typeof impl !== 'function' && typeof impl !== 'object') {
      logs.push('Could not find `' + fnName + '` in your code. Declare it in global/function scope.');
      return { logs: logs, passed: 0, failed: (problem.tests || []).length, ok: false };
    }
    var tests = problem.tests || [];
    for (var i = 0; i < tests.length; i++) {
      var t = tests[i];
      try {
        var args = clone(t.args || []);
        var original = clone(t.args || []);
        var actual;
        if (fnName === 'reverseList') {
          actual = listToArray(impl(arrayToList(args[0])));
        } else if (fnName === 'LRUCache') {
          actual = runLruOps(impl, args);
        } else if (t.check === 'inPlaceArray') {
          impl.apply(null, args);
          actual = args[0];
        } else {
          actual = impl.apply(null, args);
        }
        var ok = compareCheck(t.check || 'deepEqual', actual, t.expect, original);
        if (ok) {
          passed += 1;
          logs.push('PASS ' + t.name);
        } else {
          failed += 1;
          logs.push('FAIL ' + t.name + '  got ' + formatVal(actual) + '  expected ' + formatVal(t.expect));
        }
      } catch (err) {
        failed += 1;
        logs.push('FAIL ' + t.name + '  (' + (err && err.message ? err.message : String(err)) + ')');
      }
    }
    if (prints.length) logs.push('stdout:\n' + prints.join('\n'));
    return { logs: logs, passed: passed, failed: failed, ok: failed === 0 && passed === tests.length && tests.length > 0 };
  }

  function runJsRaw(userCode) {
    var prints = [];
    var fakeConsole = {
      log: function () { prints.push(Array.prototype.slice.call(arguments).map(String).join(' ')); },
      error: function () { prints.push('ERR ' + Array.prototype.slice.call(arguments).join(' ')); },
      warn: function () { prints.push(Array.prototype.slice.call(arguments).join(' ')); }
    };
    try {
      new Function('console', '"use strict";\n' + userCode)(fakeConsole);
      return { ok: true, text: prints.length ? prints.join('\n') : '(ran with no output)' };
    } catch (err) {
      return { ok: false, text: 'Error: ' + (err && err.message ? err.message : String(err)) };
    }
  }

  function pistonFileName(lang) {
    if (lang === 'java') return 'Main.java';
    if (lang === 'python') return 'main.py';
    return 'index.js';
  }

  function pistonBody(lang, content) {
    var language = lang === 'javascript' ? 'javascript' : lang;
    var version = PISTON_VERSIONS[language] || PISTON_VERSIONS[lang];
    return {
      language: language,
      version: version,
      files: [{ name: pistonFileName(lang), content: content }]
    };
  }

  function runPiston(lang, content) {
    return fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pistonBody(lang, content))
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('Piston HTTP ' + res.status + (t ? ': ' + t : ''));
        });
      }
      return res.json();
    }).then(function (data) {
      var compile = data.compile || {};
      var run = data.run || {};
      var out = [];
      if (compile.stderr) out.push(compile.stderr);
      if (compile.stdout) out.push(compile.stdout);
      if (run.stdout) out.push(run.stdout);
      if (run.stderr) out.push(run.stderr);
      var text = out.join('').replace(/\s+$/, '');
      var ok = (typeof run.code === 'number' ? run.code === 0 : true) && !compile.stderr;
      if (data.message && !text) text = data.message;
      return { ok: ok, text: text || '(no output)', raw: data };
    });
  }

  function writeConsole(el, lines, extraClass) {
    if (!el) return;
    if (Array.isArray(lines)) {
      el.innerHTML = lines.map(function (line) {
        var cls = /\bPASS\b/.test(line) ? 'pe-pass' : /\bFAIL\b/.test(line) || /^Error/.test(line) ? 'pe-fail' : '';
        return '<div class="' + cls + '">' + escapeHtml(line) + '</div>';
      }).join('');
    } else {
      var cls = extraClass || (/\bFAIL\b/.test(lines) ? 'pe-fail' : '');
      el.innerHTML = '<div class="' + cls + '">' + escapeHtml(lines) + '</div>';
    }
  }

  function chipClass(on) {
    return 'pe-chip' + (on ? ' is-on' : '');
  }

  function renderHub(mount) {
    var list = problemList();
    var topics = uniqueField('topic');
    var patterns = uniqueField('pattern');
    var q = (hubState.q || '').toLowerCase();
    var filtered = list.filter(function (p) {
      if (hubState.difficulty !== 'all' && p.difficulty !== hubState.difficulty) return false;
      if (hubState.topic !== 'all' && p.topic !== hubState.topic) return false;
      if (hubState.pattern !== 'all' && p.pattern !== hubState.pattern) return false;
      if (q) {
        var blob = (p.id + ' ' + p.title + ' ' + p.topic + ' ' + p.pattern + ' ' + (p.prompt || '')).toLowerCase();
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });
    var topicChips = ['all'].concat(topics).map(function (t) {
      return '<button type="button" class="' + chipClass(hubState.topic === t) + '" data-act="topic" data-val="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    }).join('');
    var patternChips = ['all'].concat(patterns).map(function (t) {
      return '<button type="button" class="' + chipClass(hubState.pattern === t) + '" data-act="pattern" data-val="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    }).join('');
    var cards = filtered.map(function (p) {
      var solved = isSolved(p.id);
      return (
        '<a class="pe-card" href="#/practice/' + encodeURIComponent(p.id) + '" data-id="' + escapeHtml(p.id) + '">' +
          '<h3>' + escapeHtml(p.title) + '</h3>' +
          '<div class="pe-meta">' +
            '<span class="pe-badge ' + escapeHtml(p.difficulty) + '">' + escapeHtml(p.difficulty) + '</span>' +
            (solved ? '<span class="pe-badge solved">solved</span>' : '') +
            escapeHtml(p.topic) + ' · ' + escapeHtml(p.pattern) +
          '</div>' +
        '</a>'
      );
    }).join('');
    var rows = filtered.map(function (p) {
      return (
        '<tr>' +
          '<td><a href="#/practice/' + encodeURIComponent(p.id) + '">' + escapeHtml(p.title) + '</a></td>' +
          '<td>' + escapeHtml(p.difficulty) + '</td>' +
          '<td>' + escapeHtml(p.topic) + '</td>' +
          '<td>' + escapeHtml(p.pattern) + '</td>' +
          '<td>' + (isSolved(p.id) ? 'solved' : '—') + '</td>' +
        '</tr>'
      );
    }).join('');
    mount.innerHTML =
      '<div class="pe-wrap">' +
        '<h1 class="pe-h1">Practice</h1>' +
        '<p class="pe-lead">Interview problems with a Java harness (Piston) and local JavaScript tests. ' + filtered.length + ' shown of ' + list.length + '.</p>' +
        '<input class="pe-search" data-act="search" placeholder="Search title, topic, pattern…" value="' + escapeHtml(hubState.q) + '">' +
        '<div class="pe-chips" data-kind="difficulty">' +
          '<button type="button" class="' + chipClass(hubState.difficulty === 'all') + '" data-act="diff" data-val="all">All</button>' +
          '<button type="button" class="' + chipClass(hubState.difficulty === 'easy') + '" data-act="diff" data-val="easy">Easy</button>' +
          '<button type="button" class="' + chipClass(hubState.difficulty === 'medium') + '" data-act="diff" data-val="medium">Medium</button>' +
          '<button type="button" class="' + chipClass(hubState.difficulty === 'hard') + '" data-act="diff" data-val="hard">Hard</button>' +
        '</div>' +
        '<div class="pe-meta">Topic</div>' +
        '<div class="pe-chips">' + topicChips + '</div>' +
        '<div class="pe-meta">Pattern</div>' +
        '<div class="pe-chips">' + patternChips + '</div>' +
        '<div class="pe-grid">' + (cards || '<p>No problems match.</p>') + '</div>' +
        '<h2>Table</h2>' +
        '<table class="pe-table"><thead><tr><th>Problem</th><th>Difficulty</th><th>Topic</th><th>Pattern</th><th>State</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="5">No problems match.</td></tr>') +
        '</tbody></table>' +
      '</div>';
    var search = $('.pe-search', mount);
    if (search) {
      search.addEventListener('input', function () {
        hubState.q = search.value;
        renderHub(mount);
        var again = $('.pe-search', mount);
        if (again) {
          again.focus();
          var n = again.value.length;
          again.setSelectionRange(n, n);
        }
      });
    }
    mount.onclick = function (ev) {
      var btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var val = btn.getAttribute('data-val');
      if (act === 'diff') hubState.difficulty = val;
      if (act === 'topic') hubState.topic = val;
      if (act === 'pattern') hubState.pattern = val;
      renderHub(mount);
    };
  }

  function starterFor(problem, lang) {
    var pack = problem.languages && problem.languages[lang];
    return pack && pack.starter ? pack.starter : '';
  }

  function draftKey(id, lang) {
    return id + '::' + lang;
  }

  function renderViz(problem, root, input) {
    if (!root) return;
    if (!problem.viz) {
      root.innerHTML = '';
      return;
    }
    if (global.Viz && typeof Viz.render === 'function') {
      try {
        Viz.render(problem.viz, input, { root: root });
      } catch (err) {
        root.innerHTML = '<p class="pe-meta">Visualizer error: ' + escapeHtml(err.message || err) + '</p>';
      }
      return;
    }
    root.innerHTML = '<p class="pe-meta">Visualizer <code>' + escapeHtml(problem.viz) + '</code> — load visualizers.js to step through this algorithm.</p>';
  }

  function renderProblem(mount, problem) {
    lastProblemId = problem.id;
    if (!problemDrafts[draftKey(problem.id, 'java')]) {
      problemDrafts[draftKey(problem.id, 'java')] = starterFor(problem, 'java');
    }
    if (!problemDrafts[draftKey(problem.id, 'javascript')]) {
      problemDrafts[draftKey(problem.id, 'javascript')] = starterFor(problem, 'javascript');
    }
    if (currentLang !== 'java' && currentLang !== 'javascript') currentLang = 'java';
    var tests = (problem.tests || []).map(function (t) {
      return '<li><strong>' + escapeHtml(t.name) + '</strong> — ' + escapeHtml(formatVal(t.args)) + ' → ' + escapeHtml(formatVal(t.expect)) + ' <code>' + escapeHtml(t.check || 'deepEqual') + '</code></li>';
    }).join('');
    var hasSol = !!problem.solution;
    var javaNote = problem.languages && problem.languages.java && problem.languages.java.wrapperNote
      ? '<p class="pe-meta">' + escapeHtml(problem.languages.java.wrapperNote) + '</p>'
      : '';
    mount.innerHTML =
      '<div class="pe-wrap">' +
        '<a class="pe-back" href="#/practice">← All problems</a>' +
        '<div class="pe-split">' +
          '<div class="pe-panel pe-left">' +
            '<span class="pe-badge ' + escapeHtml(problem.difficulty) + '">' + escapeHtml(problem.difficulty) + '</span>' +
            (isSolved(problem.id) ? '<span class="pe-badge solved">solved</span>' : '') +
            '<h1 class="pe-h1">' + escapeHtml(problem.title) + '</h1>' +
            '<p class="pe-meta">' + escapeHtml(problem.topic) + ' · ' + escapeHtml(problem.pattern) + ' · JS fn <code>' + escapeHtml(problem.fn) + '</code></p>' +
            '<p class="pe-prompt">' + escapeHtml(problem.prompt) + '</p>' +
            '<pre class="pe-sig">' + escapeHtml(problem.signature) + '</pre>' +
            '<h3>Tests</h3>' +
            '<ul class="pe-tests">' + tests + '</ul>' +
            '<div class="pe-actions">' +
              '<button type="button" class="pe-btn ghost" data-act="hint">Hint</button>' +
              (hasSol ? '<button type="button" class="pe-btn ghost" data-act="sol">Show solution</button>' : '') +
            '</div>' +
            '<div id="pe-hint" class="pe-hint pe-hidden">Pattern: <strong>' + escapeHtml(problem.pattern) + '</strong> (' + escapeHtml(problem.topic) + ')</div>' +
            (hasSol ? '<div id="pe-sol" class="pe-sol pe-hidden"><pre>' + escapeHtml(problem.solution) + '</pre></div>' : '') +
          '</div>' +
          '<div class="pe-panel pe-right">' +
            '<div class="pe-row pe-lang">' +
              '<button type="button" data-act="lang" data-val="java" class="' + (currentLang === 'java' ? 'is-on' : '') + '">Java</button>' +
              '<button type="button" data-act="lang" data-val="javascript" class="' + (currentLang === 'javascript' ? 'is-on' : '') + '">JavaScript</button>' +
            '</div>' +
            javaNote +
            '<div id="monaco-editor" class="pe-editor"></div>' +
            '<div class="pe-actions">' +
              '<button type="button" class="pe-btn" data-act="run-tests">Run tests</button>' +
              '<button type="button" class="pe-btn ghost" data-act="run-raw">Run raw</button>' +
              '<button type="button" class="pe-btn ghost" data-act="reset">Reset</button>' +
            '</div>' +
            '<pre id="console" class="pe-console">Ready.</pre>' +
            (problem.viz
              ? ('<div class="pe-viz"><h3>Visualizer</h3>' +
                 '<input id="viz-input" value="' + escapeHtml(problem.defaultInput || '') + '">' +
                 '<div id="viz-root"></div></div>')
              : '') +
          '</div>' +
        '</div>' +
      '</div>';

    var editorEl = document.getElementById('monaco-editor');
    mountEditor(editorEl, problemDrafts[draftKey(problem.id, currentLang)], currentLang);
    var consoleEl = document.getElementById('console');
    var vizRoot = document.getElementById('viz-root');
    var vizInput = document.getElementById('viz-input');
    if (problem.viz) renderViz(problem, vizRoot, vizInput ? vizInput.value : problem.defaultInput);
    if (vizInput) {
      vizInput.addEventListener('change', function () {
        renderViz(problem, vizRoot, vizInput.value);
      });
      vizInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') renderViz(problem, vizRoot, vizInput.value);
      });
    }

    function saveDraft() {
      problemDrafts[draftKey(problem.id, currentLang)] = getEditorValue();
    }

    mount.onclick = function (ev) {
      var btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'hint') {
        var h = document.getElementById('pe-hint');
        if (h) h.classList.toggle('pe-hidden');
      }
      if (act === 'sol') {
        var s = document.getElementById('pe-sol');
        if (s) s.classList.toggle('pe-hidden');
        btn.textContent = (s && !s.classList.contains('pe-hidden')) ? 'Hide solution' : 'Show solution';
      }
      if (act === 'lang') {
        saveDraft();
        currentLang = btn.getAttribute('data-val');
        renderProblem(mount, problem);
      }
      if (act === 'reset') {
        problemDrafts[draftKey(problem.id, currentLang)] = starterFor(problem, currentLang);
        setEditorValue(problemDrafts[draftKey(problem.id, currentLang)], currentLang);
        writeConsole(consoleEl, 'Reset to starter (' + currentLang + ').');
      }
      if (act === 'run-raw') {
        saveDraft();
        var code = getEditorValue();
        writeConsole(consoleEl, 'Running…');
        if (currentLang === 'javascript') {
          var raw = runJsRaw(code);
          writeConsole(consoleEl, raw.text, raw.ok ? '' : 'pe-fail');
        } else {
          runPiston('java', code).then(function (res) {
            writeConsole(consoleEl, res.text, res.ok ? '' : 'pe-fail');
          }).catch(function (err) {
            writeConsole(consoleEl,
              'Piston failed: ' + (err && err.message ? err.message : String(err)) +
              '\nJava needs the network compiler. JavaScript tests still run locally — switch language and use Run tests.',
              'pe-fail');
          });
        }
      }
      if (act === 'run-tests') {
        saveDraft();
        var src = getEditorValue();
        writeConsole(consoleEl, 'Running tests…');
        if (currentLang === 'javascript') {
          var result = runJsTests(problem, src);
          writeConsole(consoleEl, result.logs.concat([
            result.ok ? 'All checks passed.' : result.failed + ' failed.'
          ]));
          if (result.ok) markSolved(problem.id);
        } else {
          runPiston('java', src).then(function (res) {
            var lines = (res.text || '').split(/\r?\n/);
            writeConsole(consoleEl, lines);
            if (/All checks passed\./.test(res.text || '')) markSolved(problem.id);
          }).catch(function (err) {
            writeConsole(consoleEl,
              'Piston failed: ' + (err && err.message ? err.message : String(err)) +
              '\nJava needs the network compiler. JavaScript tests still run locally — switch language and use Run tests.',
              'pe-fail');
          });
        }
      }
    };
  }

  function renderMissing(mount, id) {
    mount.innerHTML =
      '<div class="pe-wrap"><a class="pe-back" href="#/practice">← All problems</a>' +
      '<h1 class="pe-h1">Unknown problem</h1><p>No problem with id <code>' + escapeHtml(id || '') + '</code>.</p></div>';
  }

  global.PracticeView = function (a, b) {
    ensureStyles();
    disposeEditor();
    var args = normalizeArgs(a, b);
    var mount = args.mount;
    var route = args.route;
    var id = parseProblemId(route);
    if (!id) {
      renderHub(mount);
      return mount;
    }
    var problem = global.Problems && typeof Problems.byId === 'function' ? Problems.byId(id) : null;
    if (!problem) {
      renderMissing(mount, id);
      return mount;
    }
    renderProblem(mount, problem);
    return mount;
  };

  global.CompilerView = function (a, b) {
    ensureStyles();
    disposeEditor();
    var args = normalizeArgs(a, b);
    var mount = args.mount;
    var lang = 'java';
    var drafts = {
      java: COMPILER_SAMPLES.java,
      javascript: COMPILER_SAMPLES.javascript,
      python: COMPILER_SAMPLES.python
    };
    mount.innerHTML =
      '<div class="pe-wrap">' +
        '<h1 class="pe-h1">Compiler</h1>' +
        '<p class="pe-lead">Free-form editor. Runs on Piston (Java 15.0.2, Node JavaScript, Python 3.10.0).</p>' +
        '<div class="pe-row pe-lang">' +
          '<button type="button" data-act="lang" data-val="java" class="is-on">Java</button>' +
          '<button type="button" data-act="lang" data-val="javascript">JavaScript</button>' +
          '<button type="button" data-act="lang" data-val="python">Python</button>' +
        '</div>' +
        '<div id="monaco-editor" class="pe-editor"></div>' +
        '<div class="pe-actions">' +
          '<button type="button" class="pe-btn" data-act="run">Run</button>' +
          '<button type="button" class="pe-btn ghost" data-act="sample">Load sample</button>' +
        '</div>' +
        '<pre id="console" class="pe-console">Ready.</pre>' +
      '</div>';
    var editorEl = document.getElementById('monaco-editor');
    var consoleEl = document.getElementById('console');
    mountEditor(editorEl, drafts.java, 'java');
    mount.onclick = function (ev) {
      var btn = ev.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'lang') {
        drafts[lang] = getEditorValue();
        lang = btn.getAttribute('data-val');
        var buttons = mount.querySelectorAll('.pe-lang button');
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.toggle('is-on', buttons[i].getAttribute('data-val') === lang);
        }
        setEditorValue(drafts[lang] || COMPILER_SAMPLES[lang], lang);
        if (!editorInstance) mountEditor(editorEl, drafts[lang], lang);
      }
      if (act === 'sample') {
        drafts[lang] = COMPILER_SAMPLES[lang];
        setEditorValue(drafts[lang], lang);
      }
      if (act === 'run') {
        drafts[lang] = getEditorValue();
        writeConsole(consoleEl, 'Running on Piston…');
        runPiston(lang, drafts[lang]).then(function (res) {
          writeConsole(consoleEl, res.text, res.ok ? '' : 'pe-fail');
        }).catch(function (err) {
          writeConsole(consoleEl, 'Piston failed: ' + (err && err.message ? err.message : String(err)), 'pe-fail');
        });
      }
    };
    return mount;
  };

  /* VizView lives in visualizers.js so the lab keeps the (el, route) signature. */
})(window);
