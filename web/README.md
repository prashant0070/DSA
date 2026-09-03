# SDET Academy (website)

Scaler-style academy UI for this repo: learn tracks, coding practice with an in-browser compiler, DSA visualizers, a free compiler, and quiz mode.

## Run locally

From the **repository root** (not this folder):

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

The app is a static SPA (`index.html` + `web/`). It fetches markdown from `question-bank/` in the browser, so it must be served over HTTP (opening the file directly will not load lessons).

## What each route is

| Hash | What you get |
| --- | --- |
| `#/` | Home, continue learning, track grid |
| `#/learn` | Curriculum grouped by foundations / automation / platform / leadership |
| `#/learn/playwright/01-fundamentals-and-architecture` | A lesson with question rail |
| `#/practice` | 31 coding problems (easy / medium / hard) |
| `#/practice/two-sum` | Monaco editor + JS tests locally + Java via [Piston](https://piston.readthedocs.io/) |
| `#/visualize/two-sum` | Step-through visualizer (Play / Step / Back) |
| `#/compiler` | Free-form Java / JavaScript / Python |
| `#/quiz/selenium` | Hide-the-answer drill on the question bank |

Progress is stored in `localStorage` (`sdet-academy-progress-v1`).

## Compiler notes

- **JavaScript tests** run in the browser. No network needed.
- **Java / Python** POST to `https://emkc.org/api/v2/piston/execute`. Needs internet. If Piston is down, use JavaScript.
- Java starters already contain a `main` grader. Fill in the method, click Run.

## Visualizers

`web/js/visualizers.js` implements: reverse array, two sum, binary search, sliding window, valid parentheses, move zeroes, Kadane, rotate array, anagram frequency, container with water, merge intervals, number of islands, reverse linked list, level-order BFS.
