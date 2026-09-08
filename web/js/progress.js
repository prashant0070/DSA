/**
 * SDET Academy progress — localStorage persistence.
 * Key: sdet-academy-progress-v1
 *
 * Shape:
 *   {
 *     lessonsDone: { 'playwright/01-fundamentals-and-architecture': true },
 *     problems: { twosum: { status: 'solved', ts: 0 }, ... },
 *     vizSeen: {},
 *     last: { route: '', title: '' }
 *   }
 */
(function (global) {
  'use strict';

  var KEY = 'sdet-academy-progress-v1';

  function empty() {
    return {
      lessonsDone: {},
      problems: {},
      vizSeen: {},
      last: { route: '', title: '' },
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readStore() {
    try {
      var raw = global.localStorage && localStorage.getItem(KEY);
      if (!raw) return empty();
      var parsed = JSON.parse(raw);
      var base = empty();
      if (!parsed || typeof parsed !== 'object') return base;
      if (parsed.lessonsDone && typeof parsed.lessonsDone === 'object') {
        base.lessonsDone = parsed.lessonsDone;
      }
      if (parsed.problems && typeof parsed.problems === 'object') {
        base.problems = parsed.problems;
      }
      if (parsed.vizSeen && typeof parsed.vizSeen === 'object') {
        base.vizSeen = parsed.vizSeen;
      }
      if (parsed.last && typeof parsed.last === 'object') {
        base.last = {
          route: parsed.last.route || '',
          title: parsed.last.title || '',
        };
      }
      return base;
    } catch (err) {
      return empty();
    }
  }

  function writeStore(state) {
    try {
      if (global.localStorage) {
        localStorage.setItem(KEY, JSON.stringify(state));
      }
    } catch (err) {
      /* private mode / quota — keep in-memory only */
    }
    return state;
  }

  var cache = readStore();

  function stem(file) {
    if (!file) return '';
    if (global.Catalog && typeof Catalog.stem === 'function') {
      return Catalog.stem(file);
    }
    return String(file).split('/').pop().replace(/\.(md|html)$/i, '');
  }

  function lessonKey(trackId, file) {
    var resolved = global.Catalog && Catalog.findLesson
      ? Catalog.findLesson(trackId, file)
      : null;
    var raw = (resolved && resolved.file) || file || '';
    return String(trackId) + '/' + stem(raw);
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

  function lessonTotal() {
    var C = global.Catalog;
    if (!C || !Array.isArray(C.tracks)) return 0;
    var n = 0;
    for (var i = 0; i < C.tracks.length; i++) {
      n += (C.tracks[i].lessons || []).length;
    }
    return n;
  }

  var Progress = {
    KEY: KEY,

    get: function () {
      return clone(cache);
    },

    set: function (patch) {
      if (!patch || typeof patch !== 'object') return clone(cache);
      if (patch.lessonsDone && typeof patch.lessonsDone === 'object') {
        cache.lessonsDone = Object.assign({}, cache.lessonsDone, patch.lessonsDone);
      }
      if (patch.problems && typeof patch.problems === 'object') {
        cache.problems = Object.assign({}, cache.problems, patch.problems);
      }
      if (patch.vizSeen && typeof patch.vizSeen === 'object') {
        cache.vizSeen = Object.assign({}, cache.vizSeen, patch.vizSeen);
      }
      if (patch.last && typeof patch.last === 'object') {
        cache.last = {
          route: patch.last.route || '',
          title: patch.last.title || '',
        };
      }
      writeStore(cache);
      return clone(cache);
    },

    markLesson: function (trackId, file) {
      var already = !!cache.lessonsDone[lessonKey(trackId, file)];
      cache.lessonsDone[lessonKey(trackId, file)] = true;
      writeStore(cache);
      if (!already && global.Vibe && typeof Vibe.celebrate === 'function') Vibe.celebrate();
      return clone(cache);
    },

    isLessonDone: function (trackId, file) {
      return !!cache.lessonsDone[lessonKey(trackId, file)];
    },

    markProblem: function (id, status) {
      if (!id) return clone(cache);
      var next = status || 'solved';
      var was = cache.problems[id] && cache.problems[id].status;
      cache.problems[id] = {
        status: next,
        ts: Date.now(),
      };
      writeStore(cache);
      if (next === 'solved' && was !== 'solved' && global.Vibe && typeof Vibe.celebrate === 'function') {
        Vibe.celebrate();
      }
      return clone(cache);
    },

    problemStatus: function (id) {
      var row = cache.problems[id];
      return row && row.status ? row.status : null;
    },

    percent: function () {
      var lessons = lessonTotal();
      var problems = problemList().length;
      var total = lessons + problems;
      if (!total) return 0;
      var doneLessons = 0;
      for (var k in cache.lessonsDone) {
        if (Object.prototype.hasOwnProperty.call(cache.lessonsDone, k) && cache.lessonsDone[k]) {
          doneLessons += 1;
        }
      }
      var doneProblems = 0;
      for (var p in cache.problems) {
        if (
          Object.prototype.hasOwnProperty.call(cache.problems, p) &&
          cache.problems[p] &&
          cache.problems[p].status === 'solved'
        ) {
          doneProblems += 1;
        }
      }
      return Math.round(((doneLessons + doneProblems) / total) * 100);
    },

    setLast: function (route, title) {
      cache.last = { route: route || '', title: title || '' };
      writeStore(cache);
      return clone(cache.last);
    },

    getLast: function () {
      return clone(cache.last || { route: '', title: '' });
    },

    reset: function () {
      cache = empty();
      writeStore(cache);
      return clone(cache);
    },
  };

  global.Progress = Progress;
})(window);
