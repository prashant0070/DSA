# Git — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. merge vs rebase?
Merge preserves branch topology. Rebase replays for linearity; don’t rebase public shared history casually.

### Q2. revert vs reset?
Revert is safe on shared branches (adds undo commit). Reset rewrites history — local/cleanup only unless force carefully coordinated.

### Q3. What is reflog?
Local history of HEAD movements — recover commits after bad reset.

### Q4. How use bisect with tests?
Automate `git bisect run ./test.sh` to find first failing commit.

### Q5. CI failed after rebase — why?
Conflict resolved wrong; lost commit; force-push raced; need fresh CI on new SHAs.
