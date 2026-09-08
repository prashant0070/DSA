/**
 * Motion, copy, and tiny celebrations for the academy lobby.
 */
(function (global) {
  'use strict';

  var TAGLINES = [
    'Stop rereading notes. Start winning loops.',
    '941 answers. One compiler. Zero sleepy PDFs.',
    'Watch the algorithm move. Then make it pass.',
    'STAR stories with numbers. Trivia without numbers.',
    'ThreadLocal in the morning. storageState at night.',
    'Flaky tests are a plot twist. You are the editor.',
  ];

  var TICKER = [
    'Two Sum', 'ThreadLocal', 'storageState', 'Grid 4', 'RAG eval',
    'Kadane', 'getByRole', 'Pact', 'IAM least privilege', 'Disagree and Commit',
    'waitForResponse', 'SoftAssert', 'UiAutomator2', 'nDCG@k', 'Blob reports',
    'Page Object', 'OAuth2', 'KEDA Jobs', 'prompt injection', 'flake SLO',
  ];

  function celebrate(origin) {
    if (global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var layer = document.createElement('div');
    layer.className = 'confetti-layer';
    var rect = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
    var x = rect ? rect.left + rect.width / 2 : global.innerWidth / 2;
    var y = rect ? rect.top + rect.height / 2 : 120;
    layer.style.setProperty('--ox', x + 'px');
    layer.style.setProperty('--oy', y + 'px');
    var colors = ['#ff7a32', '#ff4fa3', '#58f2c2', '#7c9cff', '#fbbf24', '#c084fc'];
    for (var i = 0; i < 28; i++) {
      var bit = document.createElement('i');
      var angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.4;
      var dist = 80 + Math.random() * 140;
      bit.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      bit.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 80) + 'ms';
      layer.appendChild(bit);
    }
    document.body.appendChild(layer);
    setTimeout(function () {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 1100);
  }

  function enter(root) {
    if (!root) return;
    var nodes = root.querySelectorAll('.hero, .mode-card, .stat-orb, .continue-card, .track-card, .pe-card, .quiz-card, .lesson-row, .viz-pick');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.add('enter-pop');
      nodes[i].style.animationDelay = Math.min(i * 0.035, 0.45) + 's';
    }
  }

  function tagline() {
    var day = Math.floor(Date.now() / 86400000);
    return TAGLINES[day % TAGLINES.length];
  }

  function tickerHtml() {
    var loop = TICKER.concat(TICKER).map(function (t) {
      return '<span>' + t + '</span>';
    }).join('<span class="tick-dot"></span>');
    return '<div class="ticker" aria-hidden="true"><div class="ticker-track">' + loop + '</div></div>';
  }

  function dailyProblem(list) {
    if (!list || !list.length) return null;
    var day = Math.floor(Date.now() / 86400000);
    return list[day % list.length];
  }

  global.Vibe = {
    celebrate: celebrate,
    enter: enter,
    tagline: tagline,
    tickerHtml: tickerHtml,
    dailyProblem: dailyProblem,
    TAGLINES: TAGLINES,
  };
})(window);
