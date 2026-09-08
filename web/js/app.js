/**
 * SDET Academy router and shell.
 * Hash routes:
 *   #/  #/learn  #/learn/:track  #/learn/:track/:file  #/learn/:track/:file/:qid
 *   #/practice  #/practice/:id
 *   #/visualize  #/visualize/:algo
 *   #/compiler
 *   #/quiz  #/quiz/:track
 */
(function (global) {
  'use strict';

  var bound = false;
  var searchIndex = -1;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch];
    });
  }

  function stem(file) {
    if (global.Catalog && typeof Catalog.stem === 'function') return Catalog.stem(file);
    if (!file) return '';
    return String(file).split('/').pop().replace(/\.(md|html)$/i, '');
  }

  function parseHash(raw) {
    var hash = raw == null ? global.location.hash : raw;
    var path = String(hash || '')
      .replace(/^#/, '')
      .replace(/^\/+/, '');
    var parts = path ? path.split('/').map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    }) : [];
    var route = {
      name: 'home',
      track: null,
      file: null,
      qid: null,
      id: null,
      algo: null,
      raw: hash || '#/',
      parts: parts,
    };
    var head = (parts[0] || '').toLowerCase();
    if (!head) {
      route.name = 'home';
    } else if (head === 'learn') {
      route.name = 'learn';
      route.track = parts[1] || null;
      route.file = parts[2] || null;
      route.qid = parts[3] || null;
    } else if (head === 'practice') {
      route.name = 'practice';
      route.id = parts[1] || null;
    } else if (head === 'visualize' || head === 'viz') {
      route.name = 'visualize';
      route.algo = parts[1] || null;
    } else if (head === 'compiler') {
      route.name = 'compiler';
    } else if (head === 'quiz') {
      route.name = 'quiz';
      route.track = parts[1] || null;
    } else {
      route.name = 'unknown';
    }
    return route;
  }

  function problemList() {
    var P = global.Problems;
    if (!P) return [];
    if (Array.isArray(P.list)) return P.list;
    if (Array.isArray(P.problems)) return P.problems;
    if (typeof P.all === 'function') {
      var all = P.all();
      return Array.isArray(all) ? all : [];
    }
    return [];
  }

  function problemId(p) {
    return (p && (p.id || p.slug || p.key)) || '';
  }

  function problemTitle(p) {
    return (p && (p.title || p.name || p.label)) || problemId(p);
  }

  function trackProgress(track) {
    var total = (track.lessons || []).length;
    var done = 0;
    if (global.Progress) {
      for (var i = 0; i < total; i++) {
        if (Progress.isLessonDone(track.id, track.lessons[i].file)) done += 1;
      }
    }
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function callView(name, el, route) {
    var view = global[name];
    if (!view) return false;
    if (typeof view === 'function') {
      view(el, route);
      return true;
    }
    if (typeof view.render === 'function') {
      view.render(el, route);
      return true;
    }
    return false;
  }

  function placeholder(el, title, detail) {
    el.innerHTML =
      '<div class="empty-state">' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(detail) + '</p>' +
      '</div>';
  }

  function navIcon(letter, color) {
    var bg = color ? color + '22' : '#1a2336';
    var bd = color ? color + '66' : '#2a3550';
    var fg = color || '#e8eefc';
    return (
      '<span style="width:22px;height:22px;display:grid;place-items:center;border-radius:6px;' +
      'background:' + bg + ';border:1px solid ' + bd + ';color:' + fg +
      ';font-size:11px;font-weight:650;flex-shrink:0;font-family:var(--mono)">' +
      esc(letter) +
      '</span>'
    );
  }

  function renderSidebar(route) {
    var nav = $('side-nav');
    if (!nav || !global.Catalog) return;
    var items = Catalog.nav || [];
    var primary = items.filter(function (n) {
      return !n.section && n.label !== 'Learn';
    });
    var learnItems = items.filter(function (n) { return n.section === 'learn'; });
    var html = '';

    primary.forEach(function (n) {
      var active = route.raw === n.href || route.raw.indexOf(n.href + '/') === 0;
      if (n.href === '#/practice' && route.name === 'practice') active = true;
      if (n.href === '#/visualize' && route.name === 'visualize') active = true;
      if (n.href === '#/compiler' && route.name === 'compiler') active = true;
      if (n.href === '#/quiz' && route.name === 'quiz') active = true;
      html +=
        '<a class="nav-item' + (active ? ' active' : '') + '" href="' + esc(n.href) + '">' +
          navIcon(n.icon, null) +
          '<span>' + esc(n.label) + '</span>' +
        '</a>';
    });

    html += '<div class="nav-section">Learn</div>';
    learnItems.forEach(function (n) {
      var t = Catalog.findTrack(n.trackId || n.href.replace('#/learn/', ''));
      var prog = t ? trackProgress(t) : { done: 0, total: 0 };
      var active = route.name === 'learn' && route.track === (t && t.id);
      var doneClass = prog.total && prog.done === prog.total ? ' done' : '';
      html +=
        '<a class="nav-item' + (active ? ' active' : '') + doneClass + '" href="' + esc(n.href) + '">' +
          navIcon(n.icon || (t && t.icon) || '·', t && t.color) +
          '<span>' + esc(n.label) + '</span>' +
          '<span style="margin-left:auto;font-size:11px;color:#6d7a94">' +
            prog.done + '/' + prog.total +
          '</span>' +
        '</a>';
    });

    nav.innerHTML = html;

    var sideProg = $('side-progress');
    if (sideProg && global.Progress) {
      var pct = Progress.percent();
      sideProg.innerHTML =
        '<div>Academy XP</div>' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
        '<div style="margin-top:6px">' + pct + '% filled</div>';
    }

    var pill = $('progress-pill');
    if (pill && global.Progress) {
      pill.textContent = Progress.percent() + '% XP';
    }
  }

  function crumb(href, label, last) {
    if (last) return '<span>' + esc(label) + '</span>';
    return '<a href="' + esc(href) + '">' + esc(label) + '</a><span class="sep">/</span>';
  }

  function renderCrumbs(route) {
    var el = $('crumbs');
    if (!el) return;
    var html = crumb('#/', 'Home', route.name === 'home');
    if (route.name === 'learn') {
      html += crumb('#/learn', 'Learn', !route.track);
      if (route.track) {
        var t = global.Catalog && Catalog.findTrack(route.track);
        var title = t ? t.title : route.track;
        html += crumb('#/learn/' + route.track, title, !route.file);
        if (route.file) {
          var lesson = t && Catalog.findLesson(t.id, route.file);
          html += crumb(
            '#/learn/' + route.track + '/' + encodeURIComponent(stem(route.file)),
            lesson ? lesson.title : route.file,
            !route.qid
          );
          if (route.qid) html += crumb(route.raw, route.qid, true);
        }
      }
    } else if (route.name === 'practice') {
      html += crumb('#/practice', 'Practice', !route.id);
      if (route.id) html += crumb(route.raw, route.id, true);
    } else if (route.name === 'visualize') {
      html += crumb('#/visualize', 'Visualize', !route.algo);
      if (route.algo) html += crumb(route.raw, route.algo, true);
    } else if (route.name === 'compiler') {
      html += crumb('#/compiler', 'Compiler', true);
    } else if (route.name === 'quiz') {
      html += crumb('#/quiz', 'Quiz', !route.track);
      if (route.track) {
        var qt = global.Catalog && Catalog.findTrack(route.track);
        html += crumb(route.raw, qt ? qt.title : route.track, true);
      }
    } else if (route.name === 'unknown') {
      html += crumb(route.raw, 'Not found', true);
    }
    el.innerHTML = html;
  }

  function pageTitle(route) {
    if (route.name === 'home') return 'SDET Academy';
    if (route.name === 'learn') {
      var t = global.Catalog && route.track && Catalog.findTrack(route.track);
      if (t && route.file) {
        var l = Catalog.findLesson(t.id, route.file);
        return (l ? l.title : route.file) + ' · ' + t.title;
      }
      return t ? t.title + ' · Learn' : 'Learn · SDET Academy';
    }
    if (route.name === 'practice') return route.id ? route.id + ' · Practice' : 'Practice · SDET Academy';
    if (route.name === 'visualize') return route.algo ? route.algo + ' · Visualize' : 'Visualize · SDET Academy';
    if (route.name === 'compiler') return 'Compiler · SDET Academy';
    if (route.name === 'quiz') return 'Quiz · SDET Academy';
    return 'SDET Academy';
  }

  function remember(route, title) {
    if (!global.Progress) return;
    if (route.name === 'home') return;
    Progress.setLast(route.raw || '#/', title || pageTitle(route));
  }

  function renderHome(el) {
    var tracks = (global.Catalog && Catalog.tracks) || [];
    var last = global.Progress ? Progress.getLast() : { route: '', title: '' };
    var hasLast = !!(last && last.route && last.route !== '#/' && last.route !== '#');
    var pct = global.Progress ? Progress.percent() : 0;
    var lessonDone = 0;
    var lessonTotal = 0;
    var tracksStarted = 0;
    tracks.forEach(function (t) {
      var p = trackProgress(t);
      lessonDone += p.done;
      lessonTotal += p.total;
      if (p.done) tracksStarted += 1;
    });
    var problems = problemList();
    var solved = 0;
    if (global.Progress) {
      problems.forEach(function (p) {
        if (Progress.problemStatus(problemId(p)) === 'solved') solved += 1;
      });
    }
    var vibe = global.Vibe || {};
    var tagline = typeof vibe.tagline === 'function' ? vibe.tagline() : 'Interview gym. Not a PDF graveyard.';
    var ticker = typeof vibe.tickerHtml === 'function' ? vibe.tickerHtml() : '';
    var daily = typeof vibe.dailyProblem === 'function' ? vibe.dailyProblem(problems) : (problems[0] || null);

    var continueTitle = hasLast ? (last.title || 'Pick up where you left off') : 'Playwright · Fundamentals';
    var continueRoute = hasLast ? last.route : '#/learn/playwright/01-fundamentals-and-architecture';
    var continueKicker = hasLast ? 'You were here' : 'First run';
    var continueBlurb = hasLast
      ? 'Jump back in. Momentum beats rereading the same chapter.'
      : 'Highest-leverage track: sixteen Playwright lessons, architecture first.';

    var cards = tracks.map(function (t) {
      var p = trackProgress(t);
      return (
        '<a class="track-card" href="#/learn/' + esc(t.id) + '" style="--track:' + t.color + '">' +
          '<span class="track-icon" style="background:' + t.color + '22;border-color:' + t.color +
            '66;color:' + t.color + '">' + esc(t.icon) + '</span>' +
          '<div>' +
            '<h3>' + esc(t.title) + '</h3>' +
            '<p class="track-meta">' + esc(t.blurb) + '</p>' +
          '</div>' +
          '<div class="track-meta">' + p.done + ' / ' + p.total + ' lessons · ' + p.pct + '%</div>' +
          '<div class="progress-bar"><span class="progress-fill" style="width:' + p.pct +
            '%;background:linear-gradient(90deg,' + t.color + ',#ff4fa3)"></span></div>' +
        '</a>'
      );
    }).join('');

    var dailyBlock = daily
      ? ('<a class="daily-card" href="#/practice/' + esc(problemId(daily)) + '">' +
           '<div class="daily-kicker">Today\'s boss fight</div>' +
           '<h3>' + esc(problemTitle(daily)) + '</h3>' +
           '<p>' + esc((daily.pattern || daily.topic || 'coding') + ' · ' + (daily.difficulty || 'easy')) + '</p>' +
           '<span class="btn btn-primary">Open in compiler</span>' +
         '</a>')
      : '';

    el.innerHTML =
      ticker +
      '<section class="hero hero-fun">' +
        '<div class="hero-copy">' +
          '<p class="pill pill-live"><span class="pulse-dot"></span> Interview gym is open</p>' +
          '<h1>Make the loop <span class="grad-text">feel like a game</span></h1>' +
          '<p class="lede">' + esc(tagline) + '</p>' +
          '<p class="hero-sub">Learn tracks, a live compiler, step-through visualizers, and STAR stories — built so you actually want to open it again tomorrow.</p>' +
          '<p class="hero-actions">' +
            '<a class="btn btn-primary" href="#/practice">Fight a problem</a>' +
            '<a class="btn" href="#/visualize">Watch an algorithm</a>' +
            '<a class="btn btn-ghost" href="#/quiz">Pop quiz</a>' +
          '</p>' +
        '</div>' +
        '<div class="hero-orb" aria-hidden="true">' +
          '<div class="orb orb-a"></div><div class="orb orb-b"></div><div class="orb orb-c"></div>' +
          '<div class="hero-chip">Java</div>' +
          '<div class="hero-chip chip-2">Playwright</div>' +
          '<div class="hero-chip chip-3">STAR</div>' +
        '</div>' +
      '</section>' +

      '<div class="mode-grid">' +
        '<a class="mode-card mode-learn" href="#/learn"><span class="mode-kicker">01</span><h3>Learn it</h3><p>941 interview answers with traps, not definitions.</p></a>' +
        '<a class="mode-card mode-code" href="#/practice"><span class="mode-kicker">02</span><h3>Break it</h3><p>Monaco + tests. Java in the cloud, JS instantly.</p></a>' +
        '<a class="mode-card mode-viz" href="#/visualize"><span class="mode-kicker">03</span><h3>Watch it</h3><p>Pointers move. Windows slide. Graphs light up.</p></a>' +
        '<a class="mode-card mode-quiz" href="#/quiz"><span class="mode-kicker">04</span><h3>Quiz it</h3><p>Hide the answer. Say it out loud. Then reveal.</p></a>' +
        '<a class="mode-card mode-run" href="#/compiler"><span class="mode-kicker">05</span><h3>Just run it</h3><p>Scratchpad compiler. Java, JS, or Python.</p></a>' +
      '</div>' +

      '<div class="stat-row">' +
        '<div class="stat-orb"><span class="stat-n">' + pct + '%</span><span>XP filled</span></div>' +
        '<div class="stat-orb"><span class="stat-n">' + lessonDone + '<small>/' + lessonTotal + '</small></span><span>Lessons cleared</span></div>' +
        '<div class="stat-orb"><span class="stat-n">' + solved + '<small>/' + (problems.length || 0) + '</small></span><span>Bosses down</span></div>' +
        '<div class="stat-orb"><span class="stat-n">' + tracksStarted + '<small>/' + tracks.length + '</small></span><span>Worlds started</span></div>' +
      '</div>' +

      '<div class="lobby-split">' +
        '<div class="continue-card continue-glow">' +
          '<div>' +
            '<p class="track-meta">' + esc(continueKicker) + '</p>' +
            '<h3>' + esc(continueTitle) + '</h3>' +
            '<p>' + esc(continueBlurb) + '</p>' +
          '</div>' +
          '<a class="btn btn-primary" href="' + esc(continueRoute) + '">Continue</a>' +
        '</div>' +
        dailyBlock +
      '</div>' +

      '<div class="section-title">' +
        '<h2>Pick a world</h2>' +
        '<span class="track-meta">' + tracks.length + ' tracks · hover them, they glow</span>' +
      '</div>' +
      '<div class="track-grid">' + cards + '</div>';
  }

  function renderLearnFallback(el, route) {
    if (!global.Catalog) {
      placeholder(el, 'Learn', 'Catalog is not loaded yet.');
      return;
    }
    if (!route.track) {
      renderHome(el);
      var grid = el.querySelector('.section-title');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var t = Catalog.findTrack(route.track);
    if (!t) {
      placeholder(el, 'Track not found', 'No learn track named “' + route.track + '”.');
      return;
    }
    if (route.file) {
      var lesson = Catalog.findLesson(t.id, route.file);
      placeholder(
        el,
        lesson ? lesson.title : route.file,
        'The learn viewer is still loading. Open the markdown at ' +
          ((lesson && lesson.file) || route.file) +
          (route.qid ? ' · question ' + route.qid : '') + '.'
      );
      return;
    }
    var rows = t.lessons.map(function (l, i) {
      var done = global.Progress && Progress.isLessonDone(t.id, l.file);
      return (
        '<a class="lesson-row' + (done ? ' done' : '') + '" href="#/learn/' + esc(t.id) + '/' +
          encodeURIComponent(stem(l.file)) + '">' +
          '<span class="lesson-check"></span>' +
          '<span><span class="lesson-title">' + esc(l.title) + '</span>' +
            '<span class="lesson-sub"> ' + esc(l.blurb) + '</span></span>' +
          '<span class="tag">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="track-meta">' + (done ? 'Done' : 'Open') + '</span>' +
        '</a>'
      );
    }).join('');
    el.innerHTML =
      '<section class="hero" style="padding:22px 24px">' +
        '<p class="pill">' + esc(t.kind) + '</p>' +
        '<h1>' + esc(t.title) + '</h1>' +
        '<p>' + esc(t.blurb) + '</p>' +
      '</section>' +
      '<div class="lesson-list">' + rows + '</div>';
  }

  function renderPracticeFallback(el, route) {
    var list = problemList();
    if (!list.length) {
      placeholder(
        el,
        route.id ? 'Problem ' + route.id : 'Practice',
        'The practice workspace is still loading. Problems will appear here once the bank is parsed.'
      );
      return;
    }
    var rows = list.map(function (p) {
      var id = problemId(p);
      var status = global.Progress ? Progress.problemStatus(id) : null;
      return (
        '<a class="lesson-row' + (status === 'solved' ? ' done' : '') + '" href="#/practice/' +
          encodeURIComponent(id) + '">' +
          '<span class="lesson-check"></span>' +
          '<span class="lesson-title">' + esc(problemTitle(p)) + '</span>' +
          '<span class="tag">' + esc((p && p.difficulty) || 'practice') + '</span>' +
          '<span class="track-meta">' + esc(status || 'todo') + '</span>' +
        '</a>'
      );
    }).join('');
    el.innerHTML =
      '<div class="section-title"><h2>Practice</h2><span class="track-meta">' +
        list.length + ' problems</span></div>' +
      '<div class="lesson-list">' + rows + '</div>';
  }

  function renderView(route) {
    var el = $('view');
    if (!el) return;
    if (route.name === 'home') {
      renderHome(el);
      return;
    }
    if (route.name === 'learn') {
      if (!callView('LearnView', el, route)) renderLearnFallback(el, route);
      return;
    }
    if (route.name === 'practice') {
      if (!callView('PracticeView', el, route)) renderPracticeFallback(el, route);
      return;
    }
    if (route.name === 'visualize') {
      if (!callView('VizView', el, route)) {
        placeholder(
          el,
          route.algo ? 'Visualizer · ' + route.algo : 'Visualize',
          'Algorithm visualizers load with VizView. Open a problem from Practice to see the steps.'
        );
      }
      return;
    }
    if (route.name === 'compiler') {
      if (!callView('CompilerView', el, route) && !callView('PracticeView', el, route)) {
        placeholder(
          el,
          'Compiler',
          'The in-browser compiler attaches when the practice workspace loads. Use Practice to write and run solutions.'
        );
      }
      return;
    }
    if (route.name === 'quiz') {
      if (!callView('QuizView', el, route)) {
        placeholder(
          el,
          route.track ? 'Quiz · ' + route.track : 'Quiz',
          'QuizView will pull questions from the learn tracks once the bank is parsed.'
        );
      }
      return;
    }
    placeholder(el, 'Nothing here', 'That route is not part of the academy. Head back home.');
  }

  function hideSplash() {
    var splash = $('boot-splash');
    if (splash) splash.hidden = true;
  }

  function ensureBackdrop() {
    if (document.querySelector('.sidebar-backdrop')) return;
    var bg = document.createElement('div');
    bg.className = 'sidebar-backdrop';
    bg.hidden = true;
    bg.addEventListener('click', function () {
      document.body.classList.remove('sidebar-open');
      bg.hidden = true;
    });
    document.body.appendChild(bg);
  }

  function setSidebarOpen(open) {
    document.body.classList.toggle('sidebar-open', !!open);
    var bg = document.querySelector('.sidebar-backdrop');
    if (bg) bg.hidden = !open;
  }

  function collectSearchHits(q) {
    var query = String(q || '').trim().toLowerCase();
    var hits = [];
    if (!query) return hits;
    var tracks = (global.Catalog && Catalog.tracks) || [];
    tracks.forEach(function (t) {
      if (t.title.toLowerCase().indexOf(query) !== -1 || t.blurb.toLowerCase().indexOf(query) !== -1) {
        hits.push({
          href: '#/learn/' + t.id,
          title: t.title,
          meta: 'Track · ' + t.kind,
        });
      }
      (t.lessons || []).forEach(function (l) {
        if (
          l.title.toLowerCase().indexOf(query) !== -1 ||
          (l.blurb && l.blurb.toLowerCase().indexOf(query) !== -1)
        ) {
          hits.push({
            href: '#/learn/' + t.id + '/' + encodeURIComponent(stem(l.file)),
            title: l.title,
            meta: t.title,
          });
        }
      });
    });
    problemList().forEach(function (p) {
      var title = problemTitle(p);
      if (title.toLowerCase().indexOf(query) !== -1) {
        hits.push({
          href: '#/practice/' + encodeURIComponent(problemId(p)),
          title: title,
          meta: 'Practice',
        });
      }
    });
    return hits.slice(0, 20);
  }

  function renderSearch(hits) {
    var box = $('search-results');
    if (!box) return;
    if (!hits.length) {
      box.hidden = true;
      box.innerHTML = '';
      searchIndex = -1;
      return;
    }
    box.hidden = false;
    box.innerHTML = hits.map(function (h, i) {
      return (
        '<a class="search-hit' + (i === searchIndex ? ' active' : '') + '" href="' + esc(h.href) +
          '" data-idx="' + i + '">' +
          esc(h.title) +
          '<span class="meta">' + esc(h.meta) + '</span>' +
        '</a>'
      );
    }).join('');
  }

  function closeSearch() {
    var box = $('search-results');
    if (box) {
      box.hidden = true;
      box.innerHTML = '';
    }
    searchIndex = -1;
  }

  function bind() {
    if (bound) return;
    bound = true;
    ensureBackdrop();

    var toggle = $('sidebar-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        setSidebarOpen(!document.body.classList.contains('sidebar-open'));
      });
    }

    var search = $('search');
    var results = $('search-results');
    if (search) {
      search.addEventListener('input', function () {
        searchIndex = -1;
        renderSearch(collectSearchHits(search.value));
      });
      search.addEventListener('keydown', function (ev) {
        var box = $('search-results');
        var links = box ? box.querySelectorAll('a') : [];
        if (ev.key === 'Escape') {
          closeSearch();
          search.blur();
          return;
        }
        if (ev.key === 'ArrowDown' && links.length) {
          ev.preventDefault();
          searchIndex = Math.min(links.length - 1, searchIndex + 1);
          renderSearch(collectSearchHits(search.value));
        } else if (ev.key === 'ArrowUp' && links.length) {
          ev.preventDefault();
          searchIndex = Math.max(0, searchIndex - 1);
          renderSearch(collectSearchHits(search.value));
        } else if (ev.key === 'Enter') {
          var target = links[searchIndex] || links[0];
          if (target) {
            ev.preventDefault();
            closeSearch();
            search.value = '';
            App.go(target.getAttribute('href'));
          }
        }
      });
    }
    if (results) {
      results.addEventListener('click', function (ev) {
        var a = ev.target.closest('a');
        if (!a) return;
        ev.preventDefault();
        closeSearch();
        if (search) search.value = '';
        App.go(a.getAttribute('href'));
      });
    }

    document.addEventListener('click', function (ev) {
      var wrap = document.querySelector('.search-wrap');
      if (wrap && !wrap.contains(ev.target)) closeSearch();
      if (document.body.classList.contains('sidebar-open')) {
        var sidebar = $('sidebar');
        var onToggle = toggle && toggle.contains(ev.target);
        if (sidebar && !sidebar.contains(ev.target) && !onToggle) {
          setSidebarOpen(false);
        }
      }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') setSidebarOpen(false);
    });
  }

  function render() {
    bind();
    var route = parseHash();
    document.title = pageTitle(route);
    renderSidebar(route);
    renderCrumbs(route);
    renderView(route);
    remember(route, pageTitle(route));
    setSidebarOpen(false);
    hideSplash();
    var view = $('view');
    if (view) view.scrollTop = 0;
    if (global.Vibe && typeof Vibe.enter === 'function') Vibe.enter(view);
  }

  function go(hash) {
    var next = String(hash || '#/');
    if (next.charAt(0) !== '#') next = '#' + next;
    if (location.hash === next) {
      render();
    } else {
      location.hash = next;
    }
  }

  var App = {
    go: go,
    render: render,
    parseHash: parseHash,
  };

  global.App = App;

  global.addEventListener('hashchange', render);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})(window);
