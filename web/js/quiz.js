/**
 * SDET Academy — Quiz view.
 * Route: { page, track, file, qid }
 * Uses window.parseQuestions from learn.js.
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'quiz-view-css';

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

  function catalog() {
    return global.Catalog || {};
  }

  function listTracks() {
    var C = catalog();
    return Array.isArray(C.tracks) ? C.tracks : [];
  }

  function findTrack(id) {
    var C = catalog();
    var key = decodePart(id);
    if (typeof C.findTrack === 'function') return C.findTrack(key);
    var tracks = listTracks();
    var low = String(key || '').toLowerCase();
    for (var i = 0; i < tracks.length; i++) {
      if (String(tracks[i].id).toLowerCase() === low) return tracks[i];
    }
    return null;
  }

  function findLesson(track, file) {
    var C = catalog();
    var tid = track && track.id ? track.id : track;
    if (typeof C.findLesson === 'function') return C.findLesson(tid, decodePart(file));
    return null;
  }

  function parseQuestions(md, sourceFile) {
    if (typeof global.parseQuestions === 'function') return global.parseQuestions(md, sourceFile);
    return [];
  }

  function parseQaSections(raw) {
    if (typeof global.parseQaSections === 'function') return global.parseQaSections(raw);
    return { intro: '', sections: {}, order: [] };
  }

  function fetchMd(file) {
    if (typeof global.fetchLessonMarkdown === 'function') return global.fetchLessonMarkdown(file);
    return fetch(String(file).replace(/^\/+/, '')).then(function (res) {
      if (!res.ok) throw new Error('404');
      return res.text();
    });
  }

  function mdToHtml(md) {
    if (global.marked && typeof global.marked.parse === 'function') {
      if (typeof global.marked.setOptions === 'function') {
        global.marked.setOptions({ breaks: true, gfm: true });
      }
      return global.marked.parse(String(md || ''));
    }
    return '<pre>' + esc(md) + '</pre>';
  }

  function enhance(el) {
    if (global.hljs && typeof global.hljs.highlightAll === 'function') {
      global.hljs.highlightAll();
    }
    var nodes = el.querySelectorAll('pre code.language-mermaid, pre code.mermaid');
    if (nodes.length && global.mermaid) {
      for (var i = 0; i < nodes.length; i++) {
        var div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = nodes[i].textContent;
        var pre = nodes[i].closest('pre') || nodes[i];
        pre.parentNode.replaceChild(div, pre);
      }
      if (typeof global.mermaid.run === 'function') global.mermaid.run({ querySelector: '.mermaid' });
    }
  }

  function quizKey(q) {
    return (q.sourceFile || '') + ':' + (q.id || ('q' + q.num));
  }

  function markProblem(q, status) {
    var P = global.Progress;
    var key = 'quiz:' + quizKey(q);
    if (P && typeof P.markProblem === 'function') {
      P.markProblem(key, status);
    }
    var pill = document.getElementById('progress-pill');
    if (pill && P && typeof P.percent === 'function') {
      pill.textContent = P.percent() + '% done';
    }
    try {
      document.dispatchEvent(new CustomEvent('progress-change', {
        detail: { type: 'problem', key: key, status: status },
      }));
    } catch (e) {}
  }

  function problemStatus(q) {
    var P = global.Progress;
    var key = 'quiz:' + quizKey(q);
    if (!P) return '';
    try {
      if (typeof P.problemStatus === 'function') return P.problemStatus(key) || '';
      if (typeof P.getProblem === 'function') {
        var v = P.getProblem(key);
        if (!v) return '';
        return typeof v === 'string' ? v : (v.status || v.state || '');
      }
    } catch (e) {}
    return '';
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement('style');
    css.id = STYLE_ID;
    css.textContent =
      '.quiz-view{max-width:760px;}' +
      '.quiz-picker .track-grid{margin-top:12px;}' +
      '.quiz-meta{color:var(--muted);font-size:13px;margin:0 0 12px;}' +
      '.quiz-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}' +
      '.quiz-answer .md{margin-top:8px;}' +
      '.quiz-status{font-size:12px;color:var(--muted);margin-top:8px;}';
    document.head.appendChild(css);
  }

  function trackLessons(track) {
    if (!track) return [];
    return track.lessons || [];
  }

  function lessonsForRoute(route) {
    var trackId = decodePart(route.track);
    if (!trackId || trackId === 'all') {
      var all = [];
      var tracks = listTracks();
      for (var i = 0; i < tracks.length; i++) {
        var ls = trackLessons(tracks[i]);
        for (var j = 0; j < ls.length; j++) all.push(ls[j]);
      }
      return all;
    }
    var track = findTrack(trackId);
    if (!track) return [];
    if (route.file) {
      var lesson = findLesson(track, route.file);
      return lesson ? [lesson] : [];
    }
    return trackLessons(track);
  }

  function loadQuestions(route) {
    var lessons = lessonsForRoute(route);
    return Promise.all(lessons.map(function (lesson) {
      return fetchMd(lesson.file).then(function (md) {
        var qs = parseQuestions(md, lesson.file);
        lesson.questions = qs;
        return qs;
      }).catch(function () {
        return [];
      });
    })).then(function (chunks) {
      var out = [];
      for (var i = 0; i < chunks.length; i++) {
        for (var j = 0; j < chunks[i].length; j++) out.push(chunks[i][j]);
      }
      return out;
    });
  }

  function renderPicker(root) {
    var tracks = listTracks();
    var cards = '<a class="track-card" href="#/quiz/all">' +
      '<div class="track-icon">*</div><h3>All tracks</h3>' +
      '<p class="track-meta">Random and in-order drill across every question bank.</p></a>';
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i];
      var n = (t.lessons || []).length;
      cards += '<a class="track-card" href="#/quiz/' + encodeURIComponent(t.id) + '">' +
        '<div class="track-icon">' + esc(t.icon || t.title.charAt(0)) + '</div>' +
        '<h3>' + esc(t.title) + '</h3>' +
        '<p class="track-meta">' + esc(t.blurb || '') + '</p>' +
        '<div class="track-meta">' + n + ' lesson' + (n === 1 ? '' : 's') + '</div></a>';
    }
    root.innerHTML =
      '<div class="quiz-picker">' +
        '<div class="hero"><h1>Quiz</h1>' +
        '<p class="lede">Pick a track or drill everything. Answers stay hidden until you reveal them. Mark confident or needs review as you go.</p></div>' +
        '<div class="track-grid">' + cards + '</div>' +
      '</div>';
  }

  function sectionHtml(md) {
    if (!md) return '';
    return '<div class="md prose">' + mdToHtml(md) + '</div>';
  }

  function renderSession(root, route, questions) {
    if (!questions.length) {
      root.innerHTML =
        '<div class="empty-state"><p>No questions found for this selection.</p>' +
        '<p><a href="#/quiz">Back to quiz tracks</a></p></div>';
      return;
    }

    var idx = 0;
    var want = route.qid != null ? String(route.qid).match(/(\d+)/) : null;
    if (want) {
      var num = Number(want[1]);
      for (var i = 0; i < questions.length; i++) {
        if (questions[i].num === num && (!route.file || questions[i].sourceFile.indexOf(decodePart(route.file)) !== -1)) {
          idx = i;
          break;
        }
      }
    }

    var revealed = false;
    var deepOpen = false;

    function paint() {
      var q = questions[idx];
      var status = problemStatus(q);
      var parts = parseQaSections(q.raw);
      var interview = parts.sections.interview || '';
      var oneliner = parts.sections.oneliner || '';
      var restKeys = ['intro', 'deep', 'code', 'followups', 'senior'];
      var restMd = '';
      if (parts.intro) restMd += parts.intro + '\n\n';
      for (var r = 0; r < restKeys.length; r++) {
        var k = restKeys[r];
        if (k === 'intro') continue;
        if (parts.sections[k]) restMd += parts.sections[k] + '\n\n';
      }

      var trackId = decodePart(route.track) || 'all';
      var title = 'Q' + q.num + '. ' + q.title;
      var source = q.sourceFile ? q.sourceFile.split('/').slice(-2).join('/') : '';

      var answerBlock = '';
      if (!revealed) {
        answerBlock = '<button type="button" class="btn btn-primary" data-act="reveal">Reveal answer</button>';
      } else {
        answerBlock =
          '<div class="quiz-answer">' +
            (interview ? '<h3>Interview answer</h3>' + sectionHtml(interview) : '') +
            (oneliner ? '<h3>One-liner</h3>' + sectionHtml(oneliner) : '') +
            (!interview && !oneliner ? sectionHtml(q.raw.replace(/^### Q\d+\.\s+.*$/m, '').trim()) : '') +
            (restMd.trim()
              ? (deepOpen
                ? '<div class="quiz-deep"><h3>Deep dive</h3>' + sectionHtml(restMd) + '</div>'
                : '<div class="quiz-actions"><button type="button" class="btn" data-act="deep">Show deep dive</button></div>')
              : '') +
          '</div>';
      }

      root.innerHTML =
        '<div class="quiz-session">' +
          '<p><a href="#/quiz">Quiz</a>' +
            (trackId && trackId !== 'all' ? ' / <a href="#/quiz/' + encodeURIComponent(trackId) + '">' + esc(trackId) + '</a>' : ' / all') +
          '</p>' +
          '<div class="quiz-card">' +
            '<p class="quiz-meta">' + (idx + 1) + ' of ' + questions.length +
              (source ? ' · ' + esc(source) : '') +
              (status ? ' · ' + esc(status) : '') +
            '</p>' +
            '<h2 class="quiz-q">' + esc(title) + '</h2>' +
            answerBlock +
            '<div class="quiz-actions">' +
              '<button type="button" class="btn btn-ok" data-act="confident">Mark confident</button>' +
              '<button type="button" class="btn" data-act="review">Needs review</button>' +
              '<button type="button" class="btn" data-act="next-order">Next in order</button>' +
              '<button type="button" class="btn btn-primary" data-act="next-random">Next random</button>' +
            '</div>' +
            (status ? '<div class="quiz-status">Saved as ' + esc(status) + '</div>' : '') +
          '</div>' +
        '</div>';

      enhance(root);

      root.querySelector('.quiz-card').addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'reveal') {
          revealed = true;
          paint();
          return;
        }
        if (act === 'deep') {
          deepOpen = true;
          paint();
          return;
        }
        if (act === 'confident') {
          markProblem(q, 'confident');
          paint();
          return;
        }
        if (act === 'review') {
          markProblem(q, 'review');
          paint();
          return;
        }
        if (act === 'next-order') {
          idx = (idx + 1) % questions.length;
          revealed = false;
          deepOpen = false;
          paint();
          return;
        }
        if (act === 'next-random') {
          if (questions.length === 1) {
            revealed = false;
            deepOpen = false;
            paint();
            return;
          }
          var next = idx;
          while (next === idx) next = Math.floor(Math.random() * questions.length);
          idx = next;
          revealed = false;
          deepOpen = false;
          paint();
        }
      });
    }

    paint();
  }

  function normalizeArgs(a, b) {
    if (a && a.nodeType === 1) {
      return { mount: a, route: b || {} };
    }
    return { mount: null, route: a || {} };
  }

  function QuizView(a, b) {
    ensureStyles();
    var args = normalizeArgs(a, b);
    var route = args.route;
    var root = document.createElement('div');
    root.className = 'quiz-view';

    var trackId = decodePart(route.track);
    if (!trackId || (trackId !== 'all' && !findTrack(trackId))) {
      renderPicker(root);
    } else {
      root.innerHTML = '<div class="quiz-card"><p class="lede">Loading questions…</p></div>';
      loadQuestions(route).then(function (questions) {
        renderSession(root, route, questions);
      }).catch(function () {
        root.innerHTML =
          '<div class="empty-state"><p>Could not load quiz questions.</p><p><a href="#/quiz">Back to quiz tracks</a></p></div>';
      });
    }

    if (args.mount) {
      args.mount.innerHTML = '';
      args.mount.appendChild(root);
      return args.mount;
    }
    return root;
  }

  global.QuizView = QuizView;
})(window);
