# File Upload & Download

Upload and download flows are deceptively simple interview questions with real depth: hidden inputs, native picker dialogs, in-memory files, verifying downloaded content rather than mere existence, and artifact hygiene in parallel CI runs. This file covers the full range from the one-liner answer to worked verification examples.

- Q1. How do you upload files in Playwright?
- Q2. How do you upload when there's no visible input?
- Q3. How do you upload an in-memory or generated file?
- Q4. How do you test file downloads?
- Q5. How do you verify a downloaded file is correct, not just present?
- Q6. Worked example: verify a downloaded report was generated correctly
- Q7. How would you automate valid-file upload testing?
- Q8. How would you test invalid or unsupported files?
- Q9. How would you test large-file uploads?
- Q10. Where do downloads go in CI, and how do you manage artifacts and cleanup?

### Q1. How do you upload files in Playwright?

**Interview answer** — `setInputFiles()` on the `input[type=file]` element: pass one path for a single file, an array for multi-file inputs, and an empty array to clear the selection. It sets the input's files directly — no native OS dialog ever opens, which is exactly why it's reliable in headless CI where a real file picker would be unautomatable.

**Deep dive** — Playwright injects the files into the input programmatically and fires the same `input`/`change` events a real selection would, so app-side handlers (preview rendering, validation, auto-upload) run normally. The element must be a file input — for custom-styled upload buttons that wrap a hidden input, target the input itself even if it's invisible (Q2). Multi-file arrays require the input to have the `multiple` attribute; Playwright errors if it doesn't.

```ts
test('user uploads a profile document', async ({ page }) => {
  await page.goto('/account/documents');
  await page.getByTestId('document-input').setInputFiles('fixtures/passport-scan.pdf');
  await expect(page.getByRole('listitem').filter({ hasText: 'passport-scan.pdf' })).toBeVisible();

  // Multiple files, then clear
  await page.getByTestId('document-input').setInputFiles([
    'fixtures/passport-scan.pdf',
    'fixtures/address-proof.jpg',
  ]);
  await page.getByTestId('document-input').setInputFiles([]);
});
```

**Follow-ups & traps**
- "Does this open the OS file dialog?" — No; that's the point. If a candidate describes automating the native dialog, they're thinking of the wrong tool.
- Trap: relative fixture paths resolving against the wrong CWD in CI — resolve from the test file or use a fixtures helper.
- "What events does the app see?" — Standard `input` and `change`; framework handlers fire as with a real user.

**One-liner** — `setInputFiles` on the file input: one path, an array for multiple, empty array to clear — no OS dialog involved.

### Q2. How do you upload when there's no visible input?

**Interview answer** — Three cases. Hidden input behind a styled button: `setInputFiles` works on hidden inputs, so locate the input (by test id or `input[type=file]`) and set files directly. Drag-and-drop zone backed by an input: same trick, since most dropzone libraries keep a real input under the hood. Button that programmatically opens the native picker with no persistent input: use the `filechooser` event — arm `page.waitForEvent('filechooser')` before clicking, then call `fileChooser.setFiles()`.

**Deep dive** — The filechooser pattern mirrors download handling: the event must be awaited-before-triggered or a fast dialog wins the race. For true drag-drop zones with no input at all (rare — they listen to `drop` events with a `DataTransfer`), you can synthesize a drop via `page.dispatchEvent` with a constructed `DataTransfer` in `page.evaluate`, but that's a last resort worth flagging as such — it bypasses real browser drag mechanics, so it verifies the handler, not the gesture.

```ts
// Pattern 1: hidden input behind a pretty button — target the input anyway
await page.locator('input[type="file"]').setInputFiles('fixtures/invoice.csv');

// Pattern 2: filechooser event for picker-opening buttons
const chooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Upload statement' }).click();
const chooser = await chooserPromise;
await chooser.setFiles('fixtures/statement-2026-08.csv');
await expect(page.getByText('statement-2026-08.csv')).toBeVisible();
```

**Follow-ups & traps**
- "Why does setInputFiles work on an invisible element?" — File inputs are exempt from the usual actionability visibility requirement; hiding the input is a styling convention, not an obstacle.
- Trap: clicking first, then registering `waitForEvent('filechooser')` — race; intermittent timeout.
- "True drag-drop with no input?" — Synthesized `drop` event with a `DataTransfer`; acknowledge it tests the handler, not native drag UX.

**One-liner** — Hidden inputs still accept `setInputFiles`; picker-opening buttons need the armed-first `filechooser` event.

### Q3. How do you upload an in-memory or generated file?

**Interview answer** — `setInputFiles` accepts an object — `{ name, mimeType, buffer }` — so the file never has to exist on disk. I generate the content in the test: a CSV with exactly the rows the scenario needs, a buffer of a specific size for limit testing, or content stamped with a unique run ID so parallel tests never collide on filenames.

**Deep dive** — Generated files beat checked-in fixtures whenever the content matters more than the format: boundary sizes (exactly at / one byte over the limit), unique-per-test content, or hundreds of variations you'd never commit. Buffers are built with `Buffer.from(string)` for text formats or `Buffer.alloc(size)` for size tests. Keep committed fixtures for formats that are hard to synthesize correctly (real PDFs, images with valid headers) and generate everything else.

```ts
test('imports a generated transactions CSV', async ({ page }, testInfo) => {
  const rows = [
    'date,merchant,amount',
    '2026-08-01,Acme Air,412.50',
    `2026-08-02,Run-${testInfo.workerIndex},19.99`,
  ].join('\n');

  await page.goto('/finance/import');
  await page.getByTestId('import-input').setInputFiles({
    name: `transactions-${Date.now()}.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(rows, 'utf-8'),
  });
  await expect(page.getByTestId('import-summary')).toContainText('2 transactions imported');
});
```

**Follow-ups & traps**
- "When do you prefer a real fixture file?" — Binary formats with meaningful internal structure (PDF, XLSX, images) where a hand-built buffer would be invalid.
- Trap: generating multi-hundred-MB buffers in memory on a small CI runner — mind runner RAM; stream-to-disk or test the limit at API level instead (Q9).
- "Why unique names?" — Parallel workers uploading `test.csv` to a shared backend collide; stamped names keep runs independent.

**One-liner** — `setInputFiles({ name, mimeType, buffer })` uploads a file that never touched disk — ideal for generated, unique, or size-boundary content.

### Q4. How do you test file downloads?

**Interview answer** — Arm `page.waitForEvent('download')` *before* clicking the trigger, await the `Download` object, then use `download.suggestedFilename()` for the name and `download.saveAs(path)` to persist it somewhere I control. The armed-before-click ordering matters for the same race reason as `waitForResponse`: a fast download event fired before the listener exists is simply missed.

**Deep dive** — Playwright captures downloads into a temporary location that is deleted when the context closes, so `saveAs` to a deliberate path is required if you'll read the file after any context teardown — and it's cleaner even when not strictly required. `download.path()` gives the temp path for immediate reads; `download.failure()` reports why a download died, which is worth asserting in unhappy-path tests. In config, downloads work headless by default (`acceptDownloads` defaults to true).

```ts
test('exports the orders report', async ({ page }, testInfo) => {
  await page.goto('/admin/orders');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/);
  const filePath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(filePath);
});
```

**Follow-ups & traps**
- "Click, then waitForEvent?" — Race. Arm first, always. The most common wrong ordering in candidate code.
- Trap: reading `download.path()` after closing the context — the temp file is gone; `saveAs` first.
- "Multiple files from one click?" — Each fires its own `download` event; collect with `page.on('download')` into an array.

**One-liner** — Arm `waitForEvent('download')` before the click, then `saveAs` to a path you own — the temp copy dies with the context.

### Q5. How do you verify a downloaded file is correct, not just present?

**Interview answer** — Existence is the weakest possible assertion — a zero-byte or error-page download passes it. I verify in layers: filename pattern, non-trivial size, and then *content*: parse CSVs and assert on rows, extract PDF text and assert key values, or checksum the bytes against a known-good file when content is fully deterministic. The layer I pick depends on how dynamic the file is.

**Deep dive** — Content strategies by format: CSV/JSON — parse and assert structurally (header row, row count, specific cell values), never string-compare whole files that embed timestamps; PDF — extract text with a library like `pdf-parse` and assert on the values that matter (invoice total, customer name), since PDF binary output varies between generations; XLSX — a sheet reader like `exceljs`; binary/static assets — SHA-256 against the expected checksum. The strongest verification compares file content against an independent source of truth — the API or DB — which is Q6's worked example.

```ts
import fs from 'node:fs/promises';

const filePath = testInfo.outputPath('export.csv');
await download.saveAs(filePath);

const stat = await fs.stat(filePath);
expect(stat.size).toBeGreaterThan(100); // not an empty/error stub

const lines = (await fs.readFile(filePath, 'utf-8')).trim().split('\n');
expect(lines[0]).toBe('orderId,customer,total,status');
expect(lines.length - 1).toBe(25); // 25 data rows
expect(lines.some((l) => l.includes('ORD-1042'))).toBeTruthy();
```

**Follow-ups & traps**
- "Why not diff against a golden file?" — Only valid for fully static content; embedded dates/IDs make byte-diffs permanently red.
- Trap: asserting only `suggestedFilename` — servers happily name an error page `report.csv`.
- "PDF verification?" — Text extraction and value assertions; never byte-compare generated PDFs.

**One-liner** — Verify downloads by content — parse and assert values, or checksum static files; existence and filename prove almost nothing.

### Q6. Worked example: verify a downloaded report was generated correctly

**Interview answer** — Full loop: seed known data via API, trigger the export in the UI, capture and save the download, parse it, and compare the parsed rows against the API's view of the same data. That proves the report pipeline — query, serialization, file generation — end to end, not just that a button produced bytes.

**Deep dive** — The key design choice is an independent source of truth: comparing the file against what the *API* returns for the same query means a bug in report generation can't hide (whereas comparing the file against itself, or against UI text rendered from the same payload, can tautologically pass). Normalize both sides before comparing — sort by a stable key, parse numbers, ignore formatting — so the assertion is about data, not string cosmetics.

```ts
import { parse } from 'csv-parse/sync';

test('orders CSV export matches API data', async ({ page, request }, testInfo) => {
  // Arrange: seed two known orders for an isolated worker user
  const seeded = await Promise.all([
    request.post('/api/orders', { data: { sku: 'SKU-100', qty: 1, total: 49.99 } }),
    request.post('/api/orders', { data: { sku: 'SKU-200', qty: 3, total: 89.97 } }),
  ]).then((rs) => Promise.all(rs.map((r) => r.json())));

  // Act: export from the UI
  await page.goto('/admin/orders');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const filePath = testInfo.outputPath('orders-export.csv');
  await download.saveAs(filePath);

  // Assert: parse and compare against the API as source of truth
  const fileRows = parse(await fs.readFile(filePath, 'utf-8'), { columns: true });
  const apiRows = await (await request.get('/api/orders?mine=true')).json();

  const norm = (r: any) => ({ id: r.orderId ?? r.id, total: Number(r.total) });
  const fromFile = fileRows.map(norm).sort((a, b) => a.id.localeCompare(b.id));
  const fromApi = apiRows.items.map(norm).sort((a: any, b: any) => a.id.localeCompare(b.id));

  expect(fromFile).toEqual(fromApi);
  expect(fromFile.map((r) => r.id)).toEqual(expect.arrayContaining(seeded.map((s) => s.id)));
});
```

**Follow-ups & traps**
- "What if export is async — a 'we'll email you' flow?" — Poll the API for job completion (`expect.poll`), then fetch the file from the link; the verification half stays identical.
- Trap: comparing against unseeded shared data — parallel tests mutate it mid-export; seed your own rows and filter to them.
- "Report has a million rows?" — Assert structure plus a sampled subset and totals; full comparison belongs in a backend test.

**One-liner** — Seed known data, export, parse, and compare rows against the API — verify the pipeline, not the button.

### Q7. How would you automate valid-file upload testing?

**Interview answer** — A fixtures folder of representative valid files — each supported type at realistic sizes — plus a parameterized test that uploads each and asserts the *outcome*, not just the upload gesture: the file appears in the UI, its metadata is right, and where relevant the backend confirms receipt via API. The upload succeeding as a network call is necessary but not the point; the app doing the right thing with the file is.

**Deep dive** — Parameterizing over a spec table keeps coverage visible and additions one-line. Assert at the strongest layer the app exposes: a processed preview (image thumbnail rendered, CSV row count shown) beats a filename chip, and an API check on the stored object beats both. Keep per-type expected outcomes in the table too — a CSV import shows a row summary, an image shows a thumbnail — so one test body serves all types honestly.

```ts
const validUploads = [
  { file: 'fixtures/avatar.png', expectText: 'avatar.png', expectPreview: true },
  { file: 'fixtures/contract.pdf', expectText: 'contract.pdf', expectPreview: false },
  { file: 'fixtures/import.csv', expectText: '120 rows detected', expectPreview: false },
];

for (const { file, expectText, expectPreview } of validUploads) {
  test(`accepts valid upload: ${file}`, async ({ page }) => {
    await page.goto('/documents/upload');
    await page.getByTestId('upload-input').setInputFiles(file);
    await expect(page.getByTestId('upload-result')).toContainText(expectText);
    if (expectPreview) await expect(page.getByRole('img', { name: /preview/i })).toBeVisible();
  });
}
```

**Follow-ups & traps**
- "Where do fixture files live?" — In-repo `fixtures/` folder, small and representative; large files are generated (Q3/Q9), not committed.
- Trap: asserting only "no error appeared" — a silently dropped upload passes that.
- "Backend confirmation?" — `request.get('/api/documents')` and assert the object exists with the right size/type — closes the loop.

**One-liner** — A fixture set per supported type, parameterized upload tests, and assertions on the processed outcome — not on the gesture.

### Q8. How would you test invalid or unsupported files?

**Interview answer** — The negative matrix: wrong extension, wrong *content* with a right extension — the trap case, because extension checks pass while content sniffing should fail; oversized files; empty files; and hostile filenames — path traversal attempts, very long names, unicode. For each, I assert on the error *UX*: a specific, helpful message, no broken state, and the ability to retry with a valid file afterward.

**Deep dive** — The wrong-MIME-right-extension case is where interviewers dig: renaming `malware.exe` to `report.pdf` beats client-side extension validation, so the test uploads a buffer of non-PDF bytes named `.pdf` — trivially done with the in-memory form of `setInputFiles`, where you control name, MIME, and content independently. Also assert the *backend* rejected it (API check), not just that the frontend complained — client-side validation is UX, server-side validation is security. Recovery matters: after a rejection, the widget must accept a valid file without a page reload.

```ts
test('rejects an executable disguised as a PDF', async ({ page }) => {
  await page.goto('/documents/upload');
  await page.getByTestId('upload-input').setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf', // claimed type lies too
    buffer: Buffer.from('MZ\x90\x00'), // executable magic bytes, not %PDF
  });
  await expect(page.getByRole('alert')).toContainText('File appears to be invalid or corrupted');

  // Widget recovers: a valid file still works
  await page.getByTestId('upload-input').setInputFiles('fixtures/contract.pdf');
  await expect(page.getByTestId('upload-result')).toContainText('contract.pdf');
});
```

**Follow-ups & traps**
- "Client validation passed a bad file — bug?" — Client checks are convenience; the server must independently reject. Test both layers; only the server one is a security control.
- Trap: testing only wrong extensions — the disguised-content case is the one that matters and the one usually missed.
- "Error message quality?" — Assert specific messages; a generic "upload failed" for a size violation is a UX bug worth failing on.

**One-liner** — Test disguises, sizes, empties, and hostile names — and assert the server rejects, the message helps, and the widget recovers.

### Q9. How would you test large-file uploads?

**Interview answer** — Generate the file at the boundary sizes — exactly at the limit, one byte over — rather than committing giant fixtures, raise the test and action timeouts because a real multi-hundred-MB upload legitimately takes time, and assert both the over-limit rejection and the at-limit success. And I'd honestly push the *largest* cases to the API level: the browser adds nothing to a 2 GB streaming test except fragility.

**Deep dive** — Boundary discipline is what makes this a good answer: the interesting behavior lives at limit±1, not at "some big number." In-memory buffers work to a point but are bounded by runner RAM; for genuinely large content write a sparse/streamed temp file and pass its path. UI-level large-upload tests verify the *experience* — progress bar, cancel button, failure recovery — while raw limit enforcement and streaming behavior are backend properties better tested with direct HTTP, where you control chunking and don't pay browser overhead.

```ts
test('rejects a file over the 50 MB limit', async ({ page }) => {
  test.setTimeout(120_000); // large uploads legitimately need longer
  await page.goto('/media/upload');
  await page.getByTestId('upload-input').setInputFiles({
    name: 'over-limit.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(50 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert')).toContainText('exceeds the 50 MB limit');
});
```

**Follow-ups & traps**
- "Where does the size check happen?" — Ideally client-side (fast feedback) *and* server-side (enforcement); test that bypassing the client check via API still rejects.
- Trap: committing a 200 MB fixture to git — generate it; repos and CI caches will thank you.
- "Progress and cancel?" — Throttle the endpoint via a delayed route to make the progress state observable long enough to assert and to click cancel.

**One-liner** — Generate at limit±1, extend timeouts, assert both sides of the boundary — and send the truly huge cases to the API layer.

### Q10. Where do downloads go in CI, and how do you manage artifacts and cleanup?

**Interview answer** — By default Playwright puts downloads in per-context temp directories and deletes them when the context closes — so unmanaged tests self-clean. The moment I `saveAs`, the destination should be `testInfo.outputPath(...)`, which gives each test its own directory under `test-results/`: automatically cleaned between runs, collision-free under parallelism, and picked up by the same artifact upload that grabs traces.

**Deep dive** — `testInfo.outputPath('export.csv')` resolves inside `test-results/<test-specific-dir>/`, so two workers saving `export.csv` write to different directories — hand-rolled paths like `./downloads/export.csv` are a parallel-run collision waiting to happen, and stale files from a previous run can make a test pass against yesterday's download. For files that should be *inspectable* after a failure, add `testInfo.attach('export', { path: filePath })` so the file lands in the HTML report alongside the trace. CI artifact upload then targets `test-results/` (usually on failure only, to bound storage).

```ts
test('saves the export into the test-scoped output dir', async ({ page }, testInfo) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  const filePath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(filePath);
  await testInfo.attach('orders-export', { path: filePath, contentType: 'text/csv' });
});
```

**Follow-ups & traps**
- "Why not one shared downloads folder?" — Parallel collisions and stale-file false passes; per-test dirs eliminate both by construction.
- Trap: relying on manual `fs.rm` cleanup in `afterEach` — crashed tests skip it; `test-results/` cleanup between runs is the runner's job, let it do it.
- "Artifact bloat?" — Attach/upload on failure only, and don't save downloads you don't assert on.

**One-liner** — Save downloads with `testInfo.outputPath` — per-test, parallel-safe, auto-cleaned — and `attach` anything you'd want visible in the failure report.
