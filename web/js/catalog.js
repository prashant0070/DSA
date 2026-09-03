/**
 * SDET Academy catalog — tracks, lessons, and sidebar nav.
 * Lesson `file` paths are relative to the repo root.
 */
(function (global) {
  'use strict';

  function lesson(file, title, blurb) {
    return { file: file, title: title, blurb: blurb };
  }

  function track(id, title, blurb, color, icon, kind, lessons) {
    return {
      id: id,
      title: title,
      blurb: blurb,
      color: color,
      icon: icon,
      kind: kind,
      lessons: lessons,
    };
  }

  function stem(file) {
    if (!file) return '';
    var name = String(file).split('/').pop();
    return name.replace(/\.(md|html)$/i, '');
  }

  var tracks = [
    track(
      'java',
      'Java',
      'Language fundamentals interviewers use to gate Selenium, Rest Assured, and framework design.',
      '#f89820',
      'J',
      'learn',
      [
        lesson(
          'question-bank/java/01-oop-and-language-fundamentals.md',
          'OOP & Language Fundamentals',
          'Classes, interfaces, inheritance, and the language model every Java SDET loop opens with.'
        ),
        lesson(
          'question-bank/java/02-collections-and-generics.md',
          'Collections & Generics',
          'Lists, maps, sets, generics, and which structure to pick under a clock.'
        ),
        lesson(
          'question-bank/java/03-exceptions-strings-and-memory.md',
          'Exceptions, Strings & Memory',
          'Exception design, String internals, and JVM memory questions.'
        ),
        lesson(
          'question-bank/java/04-concurrency-and-threadlocal.md',
          'Concurrency & ThreadLocal',
          'Threads, pools, and ThreadLocal WebDriver without leaks.'
        ),
        lesson(
          'question-bank/java/05-streams-lambdas-and-modern-java.md',
          'Streams, Lambdas & Modern Java',
          'Lambdas, streams, records, and Java 17/21 features used in real suites.'
        ),
        lesson(
          'question-bank/java/06-coding-questions.md',
          'Java Coding Questions',
          'String, array, and map problems asked in SDET coding rounds.'
        ),
      ]
    ),
    track(
      'typescript',
      'TypeScript',
      'Typed JavaScript for Playwright interviews: the type system, async, and coding drills.',
      '#3178c6',
      'T',
      'learn',
      [
        lesson(
          'question-bank/typescript/01-typescript-fundamentals.md',
          'TypeScript Fundamentals',
          'Types, interface vs type, generics, utility types, narrowing, and tsconfig.'
        ),
        lesson(
          'question-bank/typescript/02-async-await-and-promises.md',
          'Async/Await & Promises',
          'Event loop, the forgotten-await classic, Promise.all, and typed retry utilities.'
        ),
        lesson(
          'question-bank/typescript/03-typescript-coding-questions.md',
          'TypeScript Coding Questions',
          'Typed coding problems with solutions and complexity notes.'
        ),
      ]
    ),
    track(
      'playwright',
      'Playwright',
      'Architecture through flakiness and scenarios — the core web-automation interview track.',
      '#45ba4b',
      'P',
      'learn',
      [
        lesson(
          'question-bank/playwright/01-fundamentals-and-architecture.md',
          'Fundamentals & Architecture',
          'What/why Playwright, vs Selenium and Cypress, Browser → Context → Page, protocol internals.'
        ),
        lesson(
          'question-bank/playwright/02-installation-execution-and-cli.md',
          'Installation, Execution & CLI',
          'Install, CLI, headed/debug/UI mode, codegen, tags, retries, reporters, channels.'
        ),
        lesson(
          'question-bank/playwright/03-locators.md',
          'Locators',
          'getBy* strategies, Locator vs ElementHandle, strict mode, chaining, shadow DOM.'
        ),
        lesson(
          'question-bank/playwright/04-auto-waiting-and-actions.md',
          'Auto-Waiting & Actions',
          'Actionability checks, fill vs pressSequentially, dropdowns, drag, and the waiting map.'
        ),
        lesson(
          'question-bank/playwright/05-assertions-and-test-structure.md',
          'Assertions & Test Structure',
          'Web-first assertions, expect.poll/toPass, hooks, skip/only/fixme, test.step.'
        ),
        lesson(
          'question-bank/playwright/06-tabs-frames-and-dialogs.md',
          'Tabs, Frames & Dialogs',
          'New tabs and popups, frameLocator, dialog auto-dismiss, basic auth.'
        ),
        lesson(
          'question-bank/playwright/07-authentication-and-storage-state.md',
          'Authentication & Storage State',
          'storageState, setup projects, API login, multi-role parallel auth, stale tokens.'
        ),
        lesson(
          'question-bank/playwright/08-fixtures.md',
          'Fixtures',
          'test.extend, worker vs test scope, auto fixtures, options, mergeTests.'
        ),
        lesson(
          'question-bank/playwright/09-page-object-model.md',
          'Page Object Model',
          'POM in Playwright vs Selenium, component objects, fixture-injected POMs.'
        ),
        lesson(
          'question-bank/playwright/10-configuration-and-projects.md',
          'Configuration & Projects',
          'playwright.config.ts, use inheritance, projects, env config, timeout hierarchy, webServer.'
        ),
        lesson(
          'question-bank/playwright/11-parallel-execution-and-sharding.md',
          'Parallel Execution & Sharding',
          'Workers, fullyParallel, serial mode, worker-isolated data, shards and blob merge.'
        ),
        lesson(
          'question-bank/playwright/12-network-interception-and-api-testing.md',
          'Network Interception & API Testing',
          'route.fulfill/continue/abort, waitForResponse, HAR, APIRequestContext, WebSockets.'
        ),
        lesson(
          'question-bank/playwright/13-file-upload-and-download.md',
          'File Upload & Download',
          'setInputFiles, filechooser, download verification, invalid and large files.'
        ),
        lesson(
          'question-bank/playwright/14-debugging-tracing-and-advanced.md',
          'Debugging, Tracing & Advanced',
          'Trace Viewer, Inspector, visual regression, accessibility, device emulation.'
        ),
        lesson(
          'question-bank/playwright/15-flaky-tests.md',
          'Flaky Tests',
          'Flakiness taxonomy, CI-only failures, quarantine, and prevention by design.'
        ),
        lesson(
          'question-bank/playwright/16-scenario-questions.md',
          'Scenario Questions',
          'Worked solutions: calendars, dynamic tables, pagination, infinite scroll, wizards.'
        ),
      ]
    ),
    track(
      'selenium',
      'Selenium',
      'W3C WebDriver, waits, Grid, TestNG, and the Java-shop interview playbook.',
      '#43b02a',
      'S',
      'learn',
      [
        lesson(
          'question-bank/selenium/01-fundamentals-and-architecture.md',
          'Fundamentals & Architecture',
          'WebDriver protocol, Selenium Manager, Grid vs library, and Selenium 4 changes.'
        ),
        lesson(
          'question-bank/selenium/02-waits-locators-and-actions.md',
          'Waits, Locators & Actions',
          'Implicit vs explicit vs fluent waits, locator strategy, Actions API, stale elements.'
        ),
        lesson(
          'question-bank/selenium/03-windows-frames-alerts-and-advanced.md',
          'Windows, Frames, Alerts & Advanced',
          'Window handles, frames, alerts, and advanced interactions interviewers drill.'
        ),
        lesson(
          'question-bank/selenium/04-grid-parallel-and-threadlocal.md',
          'Grid, Parallel & ThreadLocal',
          'RemoteWebDriver, Grid 4, parallel TestNG, and a leak-free ThreadLocal driver.'
        ),
        lesson(
          'question-bank/selenium/05-framework-testng-and-design.md',
          'Framework, TestNG & Design',
          'TestNG, listeners, and how a Java Selenium framework is actually structured.'
        ),
        lesson(
          'question-bank/selenium/06-scenarios-and-troubleshooting.md',
          'Scenarios & Troubleshooting',
          'Failure playbooks, calendar/table/scroll scenarios, and exception catalog.'
        ),
      ]
    ),
    track(
      'appium',
      'Appium',
      'Mobile SDET loops: Appium 2 architecture, gestures, hybrid apps, and device farms.',
      '#7c3aed',
      'A',
      'learn',
      [
        lesson(
          'question-bank/appium/01-fundamentals-and-architecture.md',
          'Fundamentals & Architecture',
          'Appium 2 drivers-as-plugins, sessions, capabilities, and the Java client.'
        ),
        lesson(
          'question-bank/appium/02-locators-gestures-and-waits.md',
          'Locators, Gestures & Waits',
          'Mobile locators, W3C actions, waits, and gesture reliability on real devices.'
        ),
        lesson(
          'question-bank/appium/03-android-ios-and-hybrid.md',
          'Android, iOS & Hybrid',
          'UiAutomator2, XCUITest, webviews, and hybrid context switching.'
        ),
        lesson(
          'question-bank/appium/04-parallel-ci-and-real-devices.md',
          'Parallel, CI & Real Devices',
          'Device farms, emulators vs devices, and CI wiring for mobile suites.'
        ),
      ]
    ),
    track(
      'rest-assured',
      'Rest Assured & API',
      'HTTP/REST theory plus Rest Assured 5.x, contracts, and API+UI architecture.',
      '#5b8def',
      'R',
      'learn',
      [
        lesson(
          'question-bank/rest-assured/01-http-and-rest-fundamentals.md',
          'HTTP & REST Fundamentals',
          'Methods, status codes, headers, auth artifacts, idempotency, and pagination.'
        ),
        lesson(
          'question-bank/rest-assured/02-rest-assured-core.md',
          'Rest Assured Core',
          'Given/When/Then, spec reuse, JSON path, serialization, and logging.'
        ),
        lesson(
          'question-bank/rest-assured/03-auth-contract-and-negative.md',
          'Auth, Contract & Negative',
          'Auth flows, contract testing, negative cases, and failure scenarios.'
        ),
        lesson(
          'question-bank/rest-assured/04-architecture-scenarios-and-api-ui.md',
          'Architecture, Scenarios & API+UI',
          'API architecture, API+UI integration, and staff-level scenario questions.'
        ),
      ]
    ),
    track(
      'design-patterns',
      'Design Patterns',
      'SOLID, GoF, and the patterns that actually show up in test frameworks.',
      '#a78bfa',
      'D',
      'learn',
      [
        lesson(
          'question-bank/design-patterns/01-solid-and-design-principles.md',
          'SOLID & Design Principles',
          'SOLID, GRASP, composition vs inheritance, and the utils anti-pattern.'
        ),
        lesson(
          'question-bank/design-patterns/02-creational-and-structural.md',
          'Creational & Structural',
          'Factory, Builder, Singleton-in-parallel, Adapter, Decorator, Facade, POM.'
        ),
        lesson(
          'question-bank/design-patterns/03-behavioral-patterns-and-framework.md',
          'Behavioral Patterns & Framework',
          'Strategy, Observer, Command, Template Method, and assembling a framework.'
        ),
      ]
    ),
    track(
      'cicd',
      'CI/CD',
      'Pipeline design, Jenkins, GitHub Actions, Dockerized browsers, and report merge.',
      '#f5a623',
      'C',
      'learn',
      [
        lesson(
          'question-bank/cicd/01-cicd-fundamentals.md',
          'CI/CD Fundamentals',
          'CI vs CD vs CD, test stages, quality gates, artifacts, and parallelism layers.'
        ),
        lesson(
          'question-bank/cicd/02-jenkins.md',
          'Jenkins',
          'Pipelines, Playwright Jenkinsfile, agents, cron + H, credentials, shared libraries.'
        ),
        lesson(
          'question-bank/cicd/03-github-actions-and-modern-ci.md',
          'GitHub Actions & Modern CI',
          'Canonical Playwright workflow, matrix, sharding, caching, reusable workflows.'
        ),
        lesson(
          'question-bank/cicd/04-docker-for-test-automation.md',
          'Docker for Test Automation',
          'Playwright image version-matching, ipc/shm, compose stacks, and K8s at scale.'
        ),
        lesson(
          'question-bank/cicd/05-reporting-and-artifacts.md',
          'Reporting & Artifacts',
          'Reporters, sharded-report merging, Allure, flakiness metrics, exec reporting.'
        ),
      ]
    ),
    track(
      'devops-cloud',
      'Docker · K8s · AWS · Jenkins',
      'Containers, orchestration, cloud, and CI platform architecture for test platforms.',
      '#0db7d0',
      'K',
      'learn',
      [
        lesson(
          'question-bank/devops-cloud/01-docker-deep-dive.md',
          'Docker Deep Dive',
          'Images, compose, shm/PID 1, Grid in Docker, layer cache, and golden test images.'
        ),
        lesson(
          'question-bank/devops-cloud/02-kubernetes-for-test-platforms.md',
          'Kubernetes for Test Platforms',
          'Jobs, resource limits, sidecars for reports, and running suites on a cluster.'
        ),
        lesson(
          'question-bank/devops-cloud/03-aws-for-sdet.md',
          'AWS for SDET',
          'The AWS services SDET interviews actually probe: compute, storage, secrets, CI.'
        ),
        lesson(
          'question-bank/devops-cloud/04-jenkins-platform-architecture.md',
          'Jenkins Platform Architecture',
          'Controller/agent topology, shared libraries, and operating Jenkins at org scale.'
        ),
      ]
    ),
    track(
      'architecture-lead',
      'Architecture / Lead',
      'Staff-level framework design, data, environments, strategy, scale, and AI in QA.',
      '#7c9cff',
      'L',
      'learn',
      [
        lesson(
          'question-bank/architecture-lead/01-framework-architecture.md',
          'Framework Architecture',
          'Layering, design patterns, monorepo vs central repo, thousands of tests.'
        ),
        lesson(
          'question-bank/architecture-lead/02-test-data-management.md',
          'Test Data Management',
          'Factories, builders, parallel-safe uniqueness, cleanup, seeding, and PII.'
        ),
        lesson(
          'question-bank/architecture-lead/03-environments-and-secrets.md',
          'Environments & Secrets',
          'Env config layering, secret stores, traces, and ephemeral PR environments.'
        ),
        lesson(
          'question-bank/architecture-lead/04-test-strategy-and-release.md',
          'Test Strategy & Release',
          'Smoke vs regression, automate-vs-manual ROI, and the twenty-minute deploy gate.'
        ),
        lesson(
          'question-bank/architecture-lead/05-scaling-integration-and-observability.md',
          'Scaling, Integration & Observability',
          'Multi-team platforms, hours-to-minutes CI, mock/contract/E2E, SQL for SDETs.'
        ),
        lesson(
          'question-bank/architecture-lead/06-ai-in-qa-and-sdet.md',
          'AI in QA & SDET',
          'MCP and Playwright agents, generation, failure analysis, self-healing risks.'
        ),
      ]
    ),
    track(
      'ai-llm',
      'AI · LLM · RAG',
      'LLM fundamentals, RAG, agents/MCP, and eval harnesses for AI-SDET interviews.',
      '#34d399',
      'I',
      'learn',
      [
        lesson(
          'question-bank/ai-llm/01-llm-fundamentals.md',
          'LLM Fundamentals',
          'Tokens, context, sampling, tools, structured output, and the oracle problem.'
        ),
        lesson(
          'question-bank/ai-llm/02-rag-architecture-and-testing.md',
          'RAG Architecture & Testing',
          'Retrieval, chunking, citations, and how to test a RAG system without a brittle string assert.'
        ),
        lesson(
          'question-bank/ai-llm/03-agents-mcp-and-safety.md',
          'Agents MCP & Safety',
          'Tool-calling agents, MCP, guardrails, and what is safe to automate in CI.'
        ),
        lesson(
          'question-bank/ai-llm/04-eval-harness-and-ai-sdet.md',
          'Eval Harness & AI-SDET',
          'Offline evals, judges, thresholds, and how an SDET owns AI quality in the pipeline.'
        ),
      ]
    ),
    track(
      'behavioral',
      'Behavioral (STAR)',
      'STAR stories, collaboration under pressure, Amazon LPs, company loops, lead/staff.',
      '#f46a1f',
      'B',
      'learn',
      [
        lesson(
          'question-bank/behavioral/01-star-method-and-core-stories.md',
          'STAR & Core Stories',
          'Tell-me-about-yourself, hard bugs, framework challenges, and production saves.'
        ),
        lesson(
          'question-bank/behavioral/02-collaboration-conflict-and-pressure.md',
          'Collaboration & Pressure',
          'Conflict, crunch, red CI, incomplete requirements, and saying no.'
        ),
        lesson(
          'question-bank/behavioral/03-amazon-lps.md',
          'Amazon LPs',
          'Leadership Principles mapped to SDET stories interviewers actually score.'
        ),
        lesson(
          'question-bank/behavioral/04-company-loops-and-jds.md',
          'Company Loops & JDs',
          'How Amazon, Apple, and peer loops differ — and how to read a job description.'
        ),
        lesson(
          'question-bank/behavioral/05-lead-staff-stories.md',
          'Lead/Staff Stories',
          'Scope, influence, platform bets, and the stories that clear lead/staff bars.'
        ),
      ]
    ),
    track(
      'dsa-foundations',
      'DSA Foundations',
      'OOP, Java language notes, Big-O, and the patterns behind coding screens.',
      '#60a5fa',
      'F',
      'learn',
      [
        lesson(
          '00-oop-foundations/NOTES.md',
          'OOP Foundations',
          'Class vs object, encapsulation, inheritance, polymorphism, generics, equals/hashCode, SOLID.'
        ),
        lesson(
          '01-java-fundamentals/NOTES.md',
          'Java Fundamentals',
          'Types, exceptions, streams — plus deep Strings and Collections notes.'
        ),
        lesson(
          '02-complexity/NOTES.md',
          'Big-O & Complexity',
          'How to count time and space, notation, and the interview cheat sheet.'
        ),
        lesson(
          '03-dsa-patterns/NOTES.md',
          'DSA Patterns',
          'Two pointers, sliding window, hashing, BFS/DFS, DP, backtracking.'
        ),
      ]
    ),
  ];

  var primaryNav = [
    { href: '#/learn', label: 'Learn', icon: 'L' },
    { href: '#/practice', label: 'Practice', icon: 'P' },
    { href: '#/visualize', label: 'Visualize', icon: 'V' },
    { href: '#/compiler', label: 'Compiler', icon: 'C' },
    { href: '#/quiz', label: 'Quiz', icon: 'Q' },
  ];

  var learnNav = tracks.map(function (t) {
    return {
      href: '#/learn/' + t.id,
      label: t.title,
      icon: t.icon,
      section: 'learn',
      trackId: t.id,
    };
  });

  var Catalog = {
    tracks: tracks,
    nav: primaryNav.concat(learnNav),

    stem: stem,

    findTrack: function (id) {
      if (!id) return null;
      var key = String(id).toLowerCase();
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].id === key) return tracks[i];
      }
      return null;
    },

    findLesson: function (trackId, file) {
      var t = Catalog.findTrack(trackId);
      if (!t || !file) return null;
      var want = String(file).replace(/^#\/?/, '');
      var wantStem = stem(want);
      for (var i = 0; i < t.lessons.length; i++) {
        var l = t.lessons[i];
        if (
          l.file === want ||
          l.file === want + '.md' ||
          l.file.endsWith('/' + want) ||
          l.file.endsWith('/' + want + '.md') ||
          stem(l.file) === wantStem
        ) {
          return l;
        }
      }
      return null;
    },

    /**
     * Empty until learn.js parses question banks and attaches `questions`
     * onto lessons. Safe to call anytime.
     */
    allQuestions: function () {
      var out = [];
      for (var i = 0; i < tracks.length; i++) {
        var lessons = tracks[i].lessons || [];
        for (var j = 0; j < lessons.length; j++) {
          var qs = lessons[j].questions;
          if (Array.isArray(qs) && qs.length) {
            for (var k = 0; k < qs.length; k++) out.push(qs[k]);
          }
        }
      }
      return out;
    },
  };

  global.Catalog = Catalog;
})(window);
