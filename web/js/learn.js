/**
 * SDET Academy — Learn view and shared markdown/question parser.
 * Route: { page, track, file, qid }
 */
(function (global) {
  'use strict';

  var GROUP_ORDER = ['Foundations', 'Automation', 'Platform', 'Leadership'];
  var TRACK_GROUP = {
    java: 'Foundations',
    typescript: 'Foundations',
    'design-patterns': 'Foundations',
    'dsa-foundations': 'Foundations',
    playwright: 'Automation',
    selenium: 'Automation',
    appium: 'Automation',
    'rest-assured': 'Automation',
    cicd: 'Platform',
    'devops-cloud': 'Platform',
    'ai-llm': 'Platform',
    'architecture-lead': 'Leadership',
    behavioral: 'Leadership',
  };
  var SEC_DEFS = [
    { key: 'interview', label: 'Interview answer', re: /interview answer/i },
    { key: 'deep', label: 'Deep dive', re: /deep dive|deep follow/i },
    { key: 'code', label: 'Code', re: /^code\b/i },
    { key: 'followups', label: 'Follow-ups', re: /follow-?ups|cross-questions/i },
    { key: 'senior', label: 'Senior', re: /senior/i },
    { key: 'oneliner', label: 'One-liner', re: /one-liner/i },
  ];
  var STILL_WRITING = 'This lesson is still being written — check back after the next sync.';
  var STYLE_ID = 'learn-view-css';
  var mdCache = global.__mdCache || (global.__mdCache = new Map());
  var inflight = new Map();

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function decodePart(s) {
    if (s == null || s === '') return s;
    try {
      return decodeURIComponent(String(s));
    } catch (e) {
      return String(s);
    }
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'section';
  }

  function catalog() {
    return global.Catalog || {};
  }

  function listTracks() {
    var C = catalog();
    if (typeof C.getTracks === 'function') {
      var got = C.getTracks();
      if (Array.isArray(got)) return got;
    }
    return Array.isArray(C.tracks) ? C.tracks : [];
  }

  function findTrack(id) {
    var C = catalog();
    var key = decodePart(id);
    if (typeof C.findTrack === 'function') return C.findTrack(key);
    var tracks = listTracks();
    var low = String(key || '').toLowerCase();
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].id === key || String(tracks[i].id).toLowerCase() === low) return tracks[i];
    }
    return null;
  }

  function findLesson(track, file) {
    if (!track || !file) return null;
    var C = catalog();
    var tid = typeof track === 'string' ? track : track.id;
    if (typeof C.findLesson === 'function') {
      var hit = C.findLesson(tid, decodePart(file));
      if (hit) return hit;
    }
    var t = typeof track === 'string' ? findTrack(track) : track;
    if (!t || !t.lessons) return null;
    var want = decodePart(file);
    var stemFn = typeof C.stem === 'function' ? C.stem : function (f) {
      return String(f || '').split('/').pop().replace(/\.(md|html)$/i, '');
    };
    var wantStem = stemFn(want);
    for (var i = 0; i < t.lessons.length; i++) {
      var l = t.lessons[i];
      var lf = l.file || '';
      if (lf === want || lf.endsWith('/' + want) || stemFn(lf) === wantStem) return l;
    }
    return null;
  }

  function lessonStem(lesson) {
    var C = catalog();
    var file = lesson && lesson.file ? lesson.file : '';
    if (typeof C.stem === 'function') return C.stem(file);
    return String(file).split('/').pop().replace(/\.(md|html)$/i, '');
  }

  function trackGroup(track) {
    if (track.group) return track.group;
    return TRACK_GROUP[track.id] || 'More';
  }

  function groupedTracks() {
    var buckets = {};
    var i;
    for (i = 0; i < GROUP_ORDER.length; i++) buckets[GROUP_ORDER[i]] = [];
    buckets.More = [];
    var tracks = listTracks();
    for (i = 0; i < tracks.length; i++) {
      var g = trackGroup(tracks[i]);
      if (!buckets[g]) buckets[g] = [];
      buckets[g].push(tracks[i]);
    }
    var out = [];
    var names = GROUP_ORDER.concat(['More']);
    for (i = 0; i < names.length; i++) {
      if (buckets[names[i]] && buckets[names[i]].length) {
        out.push({ name: names[i], tracks: buckets[names[i]] });
      }
    }
    return out;
  }

  function fileHref(trackId, file, qid) {
    var h = '#/learn';
    if (trackId) h += '/' + encodeURIComponent(trackId);
    if (file) h += '/' + encodeURIComponent(file);
    if (qid != null && qid !== '') {
      var q = String(qid);
      h += '/' + (q.charAt(0).toLowerCase() === 'q' ? q : 'q' + q);
    }
    return h;
  }

  function qidNum(qid) {
    if (qid == null || qid === '') return null;
    var m = String(qid).match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function configureMarked() {
    var marked = global.marked;
    if (!marked) return;
    if (typeof marked.setOptions === 'function') {
      marked.setOptions({ breaks: true, gfm: true });
    } else if (typeof marked.use === 'function') {
      marked.use({ breaks: true, gfm: true });
    }
  }

  function mdToHtml(md) {
    configureMarked();
    if (global.marked && typeof global.marked.parse === 'function') {
      return global.marked.parse(String(md || ''));
    }
    return '<pre>' + esc(md) + '</pre>';
  }

  /**
   * Split interview Q&A markdown on ### Qn. headings.
   * @param {string} md
   * @param {string} [sourceFile]
   * @returns {{ id: string, num: number, title: string, raw: string, sourceFile: string }[]}
   */
  function parseQuestions(md, sourceFile) {
    var text = String(md || '');
    var re = /^### Q(\d+)\.\s+(.*)$/gm;
    var hits = [];
    var m;
    while ((m = re.exec(text)) !== null) {
      hits.push({ index: m.index, num: Number(m[1]), title: String(m[2] || '').trim() });
    }
    if (!hits.length) return [];
    var src = sourceFile || '';
    return hits.map(function (h, i) {
      var end = i + 1 < hits.length ? hits[i + 1].index : text.length;
      return {
        id: 'q' + h.num,
        num: h.num,
        title: h.title,
        raw: text.slice(h.index, end).replace(/\s+$/, ''),
        sourceFile: src,
        index: h.index,
      };
    });
  }

  function classifyHeading(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < SEC_DEFS.length; i++) {
      if (SEC_DEFS[i].re.test(t)) return SEC_DEFS[i].key;
    }
    return null;
  }

  /**
   * Split a question body into named sections (interview, deep, code, …).
   */
  function parseQaSections(raw) {
    var body = String(raw || '').replace(/^### Q\d+\.\s+.*$/m, '').replace(/^\s+/, '');
    var lines = body.split('\n');
    var current = { key: 'intro', heading: '', chunks: [] };
    var blocks = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var sm = line.match(/^\*\*([^*]+)\*\*/);
      var key = sm ? classifyHeading(sm[1]) : null;
      if (key) {
        blocks.push(current);
        current = { key: key, heading: sm[1].trim(), chunks: [line] };
      } else {
        current.chunks.push(line);
      }
    }
    blocks.push(current);
    var sections = {};
    var order = [];
    var intro = '';
    for (var j = 0; j < blocks.length; j++) {
      var text = blocks[j].chunks.join('\n').trim();
      if (blocks[j].key === 'intro') intro = text;
      else if (text) {
        sections[blocks[j].key] = text;
        order.push(blocks[j].key);
      }
    }
    return { intro: intro, sections: sections, order: order };
  }

  function fetchLessonMarkdown(file) {
    var rel = String(file || '').replace(/^\/+/, '');
    if (!rel) return Promise.reject(new Error('404'));
    if (mdCache.has(rel)) return Promise.resolve(mdCache.get(rel));
    if (inflight.has(rel)) return inflight.get(rel);
    var req = fetch(rel).then(function (res) {
      if (!res.ok) {
        var err = new Error(STILL_WRITING);
        err.status = res.status;
        throw err;
      }
      return res.text();
    }).then(function (text) {
      mdCache.set(rel, text);
      return text;
    }).finally(function () {
      inflight.delete(rel);
    });
    inflight.set(rel, req);
    return req;
  }

  function attachQuestions(lesson, md) {
    if (!lesson) return [];
    var qs = parseQuestions(md, lesson.file);
    lesson.questions = qs;
    return qs;
  }

  function sectionKeyFromNode(node) {
    if (!node || node.nodeType !== 1) return null;
    var tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) return classifyHeading(node.textContent || '');
    if (tag === 'P') {
      var strong = node.querySelector(':scope > strong:first-child');
      if (strong && node.firstElementChild === strong) {
        return classifyHeading(strong.textContent || '');
      }
    }
    return null;
  }

  function decorateArticle(article) {
    var headings = article.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (var i = 0; i < headings.length; i++) {
      if (!headings[i].id) headings[i].id = slugify(headings[i].textContent || '');
    }
    var kids = Array.prototype.slice.call(article.childNodes);
    var frag = document.createDocumentFragment();
    var bucket = null;
    function flush() {
      if (bucket) frag.appendChild(bucket);
      bucket = null;
    }
    for (var k = 0; k < kids.length; k++) {
      var node = kids[k];
      var key = sectionKeyFromNode(node);
      if (key) {
        flush();
        bucket = document.createElement('section');
        bucket.className = 'qa-section';
        bucket.dataset.sec = key;
        bucket.id = 'sec-' + key;
        bucket.appendChild(node);
      } else if (bucket) {
        bucket.appendChild(node);
      } else {
        frag.appendChild(node);
      }
    }
    flush();
    article.innerHTML = '';
    article.appendChild(frag);
  }

  function runHighlighter(article) {
    if (global.hljs && typeof global.hljs.highlightAll === 'function') {
      global.hljs.highlightAll();
    } else if (global.hljs && typeof global.hljs.highlightElement === 'function') {
      var codes = article.querySelectorAll('pre code');
      for (var i = 0; i < codes.length; i++) {
        try { global.hljs.highlightElement(codes[i]); } catch (e) {}
      }
    }
  }

  function runMermaid(article) {
    var nodes = article.querySelectorAll('pre code.language-mermaid, pre code.mermaid');
    if (!nodes.length || !global.mermaid) return;
    for (var i = 0; i < nodes.length; i++) {
      var code = nodes[i];
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code.textContent;
      var pre = code.closest('pre') || code;
      pre.parentNode.replaceChild(div, pre);
    }
    if (!global.__mermaidBooted && typeof global.mermaid.initialize === 'function') {
      global.mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      global.__mermaidBooted = true;
    }
    if (typeof global.mermaid.run === 'function') {
      global.mermaid.run({ querySelector: '.mermaid' });
    } else if (typeof global.mermaid.init === 'function') {
      global.mermaid.init(undefined, article.querySelectorAll('.mermaid'));
    }
  }

  function renderMarkdownInto(article, md) {
    article.innerHTML = mdToHtml(md);
    decorateArticle(article);
    runHighlighter(article);
    runMermaid(article);
    return article;
  }

  function isLessonDone(trackId, file) {
    var P = global.Progress;
    if (!P || typeof P.isLessonDone !== 'function') return false;
    try {
      return !!P.isLessonDone(trackId, file);
    } catch (e) {
      return false;
    }
  }

  function refreshProgressChrome() {
    var pill = document.getElementById('progress-pill');
    if (pill && global.Progress && typeof Progress.percent === 'function') {
      pill.textContent = Progress.percent() + '% done';
    }
    var side = document.getElementById('side-progress');
    if (side && global.Progress && typeof Progress.percent === 'function') {
      var pct = Progress.percent();
      var bar = side.querySelector('.bar > span');
      if (bar) bar.style.width = pct + '%';
    }
  }

  function markLessonDone(trackId, file) {
    var P = global.Progress;
    if (P && typeof P.markLesson === 'function') {
      P.markLesson(trackId, file);
    }
    refreshProgressChrome();
    try {
      document.dispatchEvent(new CustomEvent('progress-change', {
        detail: { type: 'lesson', track: trackId, file: file },
      }));
    } catch (e3) {}
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement('style');
    css.id = STYLE_ID;
    css.textContent =
      '.learn-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:20px;align-items:start;}' +
      '.q-rail{position:sticky;top:8px;max-height:calc(100vh - 100px);overflow:auto;padding:10px 8px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);}' +
      '.q-rail a{display:block;padding:6px 8px;border-radius:8px;color:var(--muted);font-size:12.5px;line-height:1.35;}' +
      '.q-rail a:hover{color:var(--ink);background:rgba(255,255,255,.04);}' +
      '.q-rail a.active{background:rgba(244,106,31,.14);color:var(--ink);}' +
      '.q-rail .nav-section{margin:4px 8px 8px;}' +
      '.learn-article{min-width:0;}' +
      '.learn-nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px;}' +
      '.qa-section{padding:2px 0 14px;scroll-margin-top:12px;border-bottom:1px solid rgba(42,53,80,.55);}' +
      '.qa-section:last-child{border-bottom:0;}' +
      '.q-toolbar{margin:12px 0 16px;}' +
      '.group-block{margin-bottom:28px;}' +
      '.lesson-row .btn{white-space:nowrap;}' +
      '@media(max-width:900px){.learn-layout{grid-template-columns:1fr;}.q-rail{position:relative;max-height:200px;}}';
    document.head.appendChild(css);
  }

  function renderTrackCards() {
    var groups = groupedTracks();
    var html = '<div class="learn-home">' +
      '<div class="hero"><h1>Learn</h1>' +
      '<p class="lede">Interview-grade tracks grouped as a curriculum. Open a track, then a lesson. STAR and technical files use the same reader.</p></div>';
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      html += '<section class="group-block">';
      html += '<div class="section-title"><h2>' + esc(group.name) + '</h2></div>';
      html += '<div class="track-grid">';
      for (var i = 0; i < group.tracks.length; i++) {
        var t = group.tracks[i];
        var n = (t.lessons || []).length;
        var color = t.color || 'var(--accent)';
        html += '<a class="track-card" href="' + fileHref(t.id) + '">' +
          '<div class="track-icon" style="color:' + esc(color) + ';border-color:' + esc(color) + '">' + esc(t.icon || t.title.charAt(0)) + '</div>' +
          '<h3>' + esc(t.title) + '</h3>' +
          '<p class="track-meta">' + esc(t.blurb || '') + '</p>' +
          '<div class="track-meta">' + n + ' lesson' + (n === 1 ? '' : 's') + '</div>' +
          '</a>';
      }
      html += '</div></section>';
    }
    if (!groups.length) {
      html += '<div class="empty-state">No learn tracks are loaded yet.</div>';
    }
    html += '</div>';
    return html;
  }

  function renderLessonList(track) {
    var lessons = track.lessons || [];
    var doneCount = 0;
    var rows = '';
    for (var i = 0; i < lessons.length; i++) {
      var l = lessons[i];
      var stem = lessonStem(l);
      var done = isLessonDone(track.id, l.file) || isLessonDone(track.id, stem);
      if (done) doneCount++;
      rows += '<div class="lesson-row' + (done ? ' done' : '') + '">' +
        '<span class="lesson-check" aria-hidden="true"></span>' +
        '<div><div class="lesson-title">' + esc(l.title) + '</div>' +
        '<div class="lesson-sub">' + esc(l.blurb || '') + '</div></div>' +
        '<span class="tag">' + (i + 1) + ' / ' + lessons.length + '</span>' +
        '<a class="btn btn-primary" href="' + fileHref(track.id, stem) + '">Start</a>' +
        '</div>';
    }
    return '<div class="learn-track">' +
      '<p><a href="#/learn">All tracks</a></p>' +
      '<div class="hero"><h1>' + esc(track.title) + '</h1>' +
      '<p class="lede">' + esc(track.blurb || '') + '</p>' +
      '<div class="track-meta" style="margin-top:10px">' + doneCount + ' of ' + lessons.length + ' lessons done</div></div>' +
      '<div class="lesson-list">' + (rows || '<div class="empty-state">No lessons in this track yet.</div>') + '</div></div>';
  }

  function renderMissing(root, trackId) {
    root.innerHTML = '<div class="empty-state"><p>' + esc(STILL_WRITING) + '</p></div>' + renderTrackCards();
    if (trackId) {
      var back = root.querySelector('.learn-home');
      if (back) {
        var p = document.createElement('p');
        p.innerHTML = '<a href="' + fileHref(trackId) + '">Back to track</a> · <a href="#/learn">All tracks</a>';
        back.insertBefore(p, back.firstChild);
      }
    }
  }

  function presentSections(htmlHost) {
    var present = {};
    var secs = htmlHost.querySelectorAll('.qa-section[data-sec]');
    for (var i = 0; i < secs.length; i++) present[secs[i].dataset.sec] = true;
    return present;
  }

  function buildToolbar(present) {
    var tabs = '';
    var any = false;
    for (var i = 0; i < SEC_DEFS.length; i++) {
      if (present[SEC_DEFS[i].key]) {
        any = true;
        tabs += '<button type="button" class="tab" data-sec="' + SEC_DEFS[i].key + '">' +
          esc(SEC_DEFS[i].label) + '</button>';
      }
    }
    if (!any) return '';
    return '<div class="tabs q-toolbar" role="tablist">' + tabs + '</div>';
  }

  function bindToolbar(toolbar, article) {
    if (!toolbar) return;
    toolbar.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-sec]');
      if (!btn) return;
      var sec = btn.getAttribute('data-sec');
      var buttons = toolbar.querySelectorAll('[data-sec]');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle('active', buttons[i] === btn);
      }
      var target = article.querySelector('.qa-section[data-sec="' + sec + '"]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderLesson(root, route, track, lesson) {
    var file = lesson.file;
    var stem = lessonStem(lesson);
    root.innerHTML = '<p class="muted"><a href="#/learn">Learn</a> / <a href="' +
      fileHref(track.id) + '">' + esc(track.title) + '</a></p>' +
      '<p class="lede">Loading lesson…</p>';

    fetchLessonMarkdown(file).then(function (md) {
      var questions = attachQuestions(lesson, md);
      var want = qidNum(route.qid);
      var preamble = '';
      if (questions.length) {
        preamble = md.slice(0, questions[0].index != null ? questions[0].index : md.indexOf(questions[0].raw)).trim();
        if (!preamble) {
          var cut = md.indexOf(questions[0].raw);
          preamble = cut > 0 ? md.slice(0, cut).trim() : '';
        }
      }

      var showingQ = null;
      if (questions.length && want != null) {
        for (var i = 0; i < questions.length; i++) {
          if (questions[i].num === want) { showingQ = questions[i]; break; }
        }
      }

      var articleMd;
      var mode;
      if (!questions.length) {
        articleMd = md;
        mode = 'notes';
      } else if (showingQ) {
        articleMd = showingQ.raw;
        mode = 'question';
      } else {
        articleMd = preamble || questions[0].raw;
        mode = preamble ? 'overview' : 'question';
        if (!preamble) showingQ = questions[0];
      }

      var rail = '';
      if (questions.length) {
        rail += '<nav class="q-rail" aria-label="Questions">';
        rail += '<div class="nav-section">Questions</div>';
        if (preamble) {
          rail += '<a href="' + fileHref(track.id, stem) + '" class="' + (mode === 'overview' ? 'active' : '') + '">Overview</a>';
        }
        for (var q = 0; q < questions.length; q++) {
          var qq = questions[q];
          var active = showingQ && showingQ.num === qq.num;
          rail += '<a href="' + fileHref(track.id, stem, qq.id) + '" class="' + (active ? 'active' : '') + '">Q' +
            qq.num + '. ' + esc(qq.title) + '</a>';
        }
        rail += '</nav>';
      }

      var idx = -1;
      if (showingQ) {
        for (var j = 0; j < questions.length; j++) {
          if (questions[j].num === showingQ.num) { idx = j; break; }
        }
      }

      root.innerHTML =
        '<p><a href="#/learn">Learn</a> / <a href="' + fileHref(track.id) + '">' + esc(track.title) + '</a></p>' +
        '<div class="learn-layout">' +
          rail +
          '<div class="learn-article">' +
            '<h1>' + esc(lesson.title || track.title) + '</h1>' +
            (showingQ ? '<p class="lede">Q' + showingQ.num + '. ' + esc(showingQ.title) + '</p>' : '') +
            '<div class="toolbar-slot"></div>' +
            '<article class="md prose"></article>' +
            '<div class="learn-nav"></div>' +
          '</div>' +
        '</div>';

      var article = root.querySelector('article.md');
      renderMarkdownInto(article, articleMd);

      var slot = root.querySelector('.toolbar-slot');
      var toolbarHtml = buildToolbar(presentSections(article));
      if (toolbarHtml) {
        slot.innerHTML = toolbarHtml;
        bindToolbar(slot.querySelector('.q-toolbar'), article);
      }

      var nav = root.querySelector('.learn-nav');
      var prevHref = '';
      var nextHref = '';
      if (questions.length) {
        if (mode === 'overview' && questions[0]) {
          nextHref = fileHref(track.id, stem, questions[0].id);
        } else if (idx >= 0) {
          if (idx > 0) prevHref = fileHref(track.id, stem, questions[idx - 1].id);
          else if (preamble) prevHref = fileHref(track.id, stem);
          if (idx < questions.length - 1) nextHref = fileHref(track.id, stem, questions[idx + 1].id);
        }
      }
      var doneAlready = isLessonDone(track.id, file) || isLessonDone(track.id, stem);
      nav.innerHTML =
        (questions.length
          ? '<a class="btn' + (prevHref ? '' : ' btn-ghost') + '"' + (prevHref ? ' href="' + prevHref + '"' : ' aria-disabled="true"') + '>Previous Q</a>' +
            '<a class="btn' + (nextHref ? '' : ' btn-ghost') + '"' + (nextHref ? ' href="' + nextHref + '"' : ' aria-disabled="true"') + '>Next Q</a>'
          : '') +
        '<button type="button" class="btn btn-ok" data-act="done">' + (doneAlready ? 'Done' : 'Mark done') + '</button>';

      var doneBtn = nav.querySelector('[data-act="done"]');
      doneBtn.addEventListener('click', function () {
        markLessonDone(track.id, file);
        doneBtn.textContent = 'Done';
      });
    }).catch(function () {
      renderMissing(root, track.id);
    });
  }

  function normalizeArgs(a, b) {
    if (a && a.nodeType === 1) {
      return { mount: a, route: b || {} };
    }
    return { mount: null, route: a || {} };
  }

  function LearnView(a, b) {
    ensureStyles();
    configureMarked();
    var args = normalizeArgs(a, b);
    var route = args.route;
    var root = document.createElement('div');
    root.className = 'learn-view';

    var trackId = decodePart(route.track);
    var file = decodePart(route.file);

    if (!trackId) {
      root.innerHTML = renderTrackCards();
    } else {
      var track = findTrack(trackId);
      if (!track) {
        renderMissing(root, null);
      } else if (!file) {
        root.innerHTML = renderLessonList(track);
      } else {
        var lesson = findLesson(track, file);
        if (!lesson) {
          lesson = { file: file, title: file, blurb: '' };
          if (!/\.md$/i.test(lesson.file) && file.indexOf('/') === -1) {
            renderMissing(root, track.id);
          } else {
            renderLesson(root, route, track, lesson);
          }
        } else {
          renderLesson(root, route, track, lesson);
        }
      }
    }

    if (args.mount) {
      args.mount.innerHTML = '';
      args.mount.appendChild(root);
      return args.mount;
    }
    return root;
  }

  global.parseQuestions = parseQuestions;
  global.parseQaSections = parseQaSections;
  global.fetchLessonMarkdown = fetchLessonMarkdown;
  global.LearnView = LearnView;
})(window);
