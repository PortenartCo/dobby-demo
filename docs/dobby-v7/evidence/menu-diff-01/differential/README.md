# MENU-DIFF-01 differential execution

The three requested scripts fail for the same observed reasons on exact Famille commit `5b764ef367553e9945fb72a6b563b55adc41e040` and exact Menu commit `3f7fe0e36e1e142cefaada5d575196c436b444e4`. This conclusion compares failing actions, complete error messages, underlying error stacks, case patterns and exit codes. It does not infer a passing suite from matching failures.

| Script | Famille | Menu | First failure / failing cases |
| --- | --- | --- | --- |
| `family.cjs` | exit 1 | exit 1 | 320 px, line 14:62; `member-new` click times out after 12000 ms on disabled `#add-member-btn`. Stops before the 390 px pass and before Menu navigation. |
| `e05-edge.cjs` | exit 1 | exit 1 | 390 px, line 3:385; first `#magic-patronus-edit` click times out after 30000 ms because this selector is absent. Stops before the later Menu navigation. |
| `register-review.cjs` | 24 PASS / 4 FAIL, exit 1 | 24 PASS / 4 FAIL, exit 1 | `menu-member-draft` and `menu-medical-draft` at both 320 and 390 px; fills of `#member-firstname` and `#consultation-title` time out after 8000 ms before either case reaches Menu navigation. |

For all six observed failure instances, the full error message and complete underlying Playwright error stack are identical after replacing only the absolute frozen worktree root with `<WORKTREE>`. The test frames are `family.cjs:14:62`, `e05-edge.cjs:3:385`, `register-review.cjs:7:170` and `register-review.cjs:9:210`. Both stdout streams are raw-identical for each script; stderr becomes identical with that sole root replacement. `comparison.json`, each `analysis.json`, raw stdout/stderr and raw `calls.jsonl` provide the evidence. No application page errors were captured.

The separate read-only synthetic DOM observation is identical on both commits. It confirms:

- Member creation is disabled and described by `fam-create-permission`: “Gestion suspendue : l’association vérifiée de votre compte au foyer reste à établir.”
- The member name input is effectively disabled by its enclosing `fieldset.fam-member-identity`; its own `disabled` property is false. `fam-member-permission` gives the same explanation.
- The medical title input is disabled; the form says the connected account is not linked to a member with verified parental rights.
- `#magic-patronus-edit` is absent. Existing profile editing controls disclose the same unavailable account/member association and parental rights.

`../fixture-identity.json` documents that the failing prefixes and seeded fixtures are identical, that all of `register-review.cjs` is byte-identical, and that the native engine/configuration trees are identical. Test SHA256 and Git blob IDs are also preserved in `manifest.json`; final unchanged hashes, HEADs and clean tracked statuses are in `verification.json`.

## Raw differences retained

These are not byte-identical raw executions. `manifest.json` and each failure record preserve real durations. The family, E05 and register process durations were respectively 14.12 / 31.78 / 64.93 seconds on Famille and 13.84 / 31.83 / 67.10 seconds on Menu. Action elapsed values are retained without rounding in JSON.

One diagnostic pre-call stack, for `menu-medical-draft` at 320 px, includes `runNextTicks (node:internal/process/task_queues:65:5)` and `process.processImmediate (node:internal/timers:502:9)` only on Famille. Its test callsite and complete resulting Playwright error stack are identical. `comparison.json` explicitly includes this callsite diff; no scheduler frame was removed from stored evidence.

The register runs recorded 314 versus 317 blocked external asset failures. Both contain 28 attempts of the same Google font URL and 28 attempts of the same outer-page image URL. The remaining 258 versus 261 attempts are the same legacy Dobby hero image from `essai-stitch-v5-famille/index.html:1901`, whose Git blob is identical (`bf085fd2a4561c2201190c19d46e719083023cb0`). No new external URL appears. Counts vary in both directions among cases, including stale-editor cases before Menu navigation, while all 258 instrumented API calls and the 24/4 case pattern are retained on each side. `network-comparison.json` preserves every per-case URL count. The exact scheduling/retry cause was not traced; this telemetry delta does not change the captured failure causes. The tests abort all non-origin requests through the same route callback.

Only worktree roots are normalized in comparison text. Timing, retry counts, ANSI escapes, fixture content, scheduler frames and all other paths remain present. Raw logs are authoritative; normalized copies are separate files.

## Reproduce

The original runner is `run.py`, using the exact two worktrees listed in `manifest.json`. It starts the same ordinary Python HTTP server at `127.0.0.1:8771`, serves each worktree directly in turn, and runs all three scripts sequentially before switching commits. There are no Git-source HTTP overrides. Tests and production files are never edited. All historical screenshot writes are redirected outside the frozen worktrees by the same preload.

Each execution is exactly:

```text
node --require /tmp/dobby-menu-diff-01/preload.cjs essai-stitch-v7/tests/<script>.cjs
```

The current working directory is the relevant frozen worktree. Common variables are `NODE_PATH=/workspace/dobby-v7-menu-simplification/essai-stitch-v7/tests/node_modules`, `CHROMIUM_PATH=/usr/bin/chromium`, `DOBBY_TEST_ORIGIN=http://127.0.0.1:8771`, `TZ=Europe/Paris`, and `LANG=LC_ALL=C.UTF-8`. Review case/width filters and inherited DOBBY/DIFF/Node option overrides are removed. Node and Chromium versions are in `manifest.json`; Playwright version is in `verification.json`. Each actual browser reports `154.0.8037.57`, and viewport/context options match across commits.

To reproduce from a fresh empty `/tmp/dobby-menu-diff-01`, place these harness files there, retain or recreate the two exact-SHA worktrees and shared dependencies, then run `python3 /tmp/dobby-menu-diff-01/run.py`, `python3 /tmp/dobby-menu-diff-01/compare.py`, `python3 /tmp/dobby-menu-diff-01/observe-dom.py`, and `python3 /tmp/dobby-menu-diff-01/supplement.py`. Preserve each output directory before a repeat: `calls.jsonl` is append-only within one execution.

This is a differential assessment of these three scripts under their synthetic fixtures. Their early stops leave later Family and E05 assertions unexecuted. The matching failures establish no newly observed failure cause for this matrix; they do not establish that all code paths pass or that the entire DOBBY suite is green. No commits or pushes were made.
