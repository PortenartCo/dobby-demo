# Public Family effects verification — 2026-11-12

The existing `family-review-effects.cjs` suite passed on the canonical publication:

https://portenartco.github.io/dobby-demo/essai-dobby-v7-famille-review-20261112/essai-stitch-v7/famille.html

The served manifest is `V7-FAMILLE`, source `5b764ef367553e9945fb72a6b563b55adc41e040`, base `6a6fcd9bcee522da7342de391e5c3d7bfe1955b3`.

| Coverage | Result |
| --- | --- |
| Widths | 320, 390, 1440 px — all pass |
| Family views | 13 per width, 39 total |
| Captures | 39 PNG files |
| Ambient particles | 22 per view |
| ON/OFF painted difference | 2875–3484 pixels per view |
| Persistent OFF preference | Pass |
| Reduced motion | Pass |
| Repeated mounts and visibility pause | Pass |
| Chat/native ambience return | Pass |
| Viewport containment, business-data stability, automatic audio | Pass |
| Page errors | None |

The suite ran unchanged, with `DOBBY_TEST_ORIGIN` set to the canonical publication root and `DOBBY_FAM_EVIDENCE` set to this directory. No product change, harness fix, commit, or push was performed for this verification.

Public assets were fetched from the canonical origin. Nonlocal browser requests were aborted; this is frontend verification against the published demo, not real backend authorization testing.

See [results.json](results.json) for command metadata, [effects/results.json](effects/results.json) for per-view measurements, [the run log](logs/family-review-effects.log), and [the served manifest](review-manifest.json).
