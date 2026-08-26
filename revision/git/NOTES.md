# Git for interviews — detailed notes

**Interview Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

---

## Commands with intent

| Command | Intent |
| --- | --- |
| merge | Combine histories |
| rebase | Replay commits for linear history |
| cherry-pick | Apply one commit elsewhere |
| revert | New commit that undoes a past commit (safe for shared) |
| reset | Move branch pointer (dangerous if shared) |
| reflog | Recover “lost” commits |
| bisect | Binary search for bad commit |

---

## Interview scenario

> Prod bug introduced ~5 commits ago. Find it.

`git bisect start` → mark good/bad → automated test script → lands on culprit → fix forward or revert.

---

## Conflict & branching

- Resolve conflicts understanding both sides
- Trunk-based vs git-flow awareness
- Protect main; PR reviews; signed-off policies as needed

Next: [INTERVIEW-QA.md](INTERVIEW-QA.md)
