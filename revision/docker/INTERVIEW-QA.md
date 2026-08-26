# Docker — interview Q&A

**Notes:** [NOTES.md](NOTES.md)

### Q1. Image vs container?
Image is the template; container is the running process+filesystem from that image.

### Q2. Why multi-stage builds?
Smaller final images, fewer build tools in prod/runtime, better security surface.

### Q3. Why tests fail in container but pass on laptop?
Missing env vars, timing, filesystem case sensitivity, dependencies not in image, localhost networking differences.

### Q4. How avoid secrets in images?
Inject at runtime via env/files from secret stores; never `ENV PASSWORD=...` in Dockerfile committed.

### Q5. Layer caching tip?
Copy dependency manifests first, install, then copy source — code changes won’t bust dependency cache.
