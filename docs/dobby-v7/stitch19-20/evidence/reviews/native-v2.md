# Native frontend scoped re-review — PASS

Reviewed immutable v2 tree `e945a004bb6e957bf6ae4be35ed248fe10f5c268`, specifically the changes since native review v1 (`cfc56eb6f5f6f5aa2283f0e25ff5566ca2998d5a`). No remaining native frontend blocker was found. The v1 P2 stale-profile finding is resolved.

`essai-stitch-v7/ceremonies.js:25–37` refreshes the native presentation after `DobbyRegister.lock()` settles, and emits final confirmation after that refresh. The refresh also runs after an automatic House confirmation while keeping the Patronus dialog open. Context checks prevent that refresh/event from being applied to a replacement account context.

Independent Chromium probes against the immutable v2 source, with every external request blocked, passed:

- Real personal-profile House button → direct Serdaigle choice → confirmation: canonical ID `ravenclaw` and displayed `Serdaigle` agree immediately. The confirmation listener sees `registerBusy:false` and the updated screen.
- Real personal-profile Patronus button → direct Dauphin choice → confirmation: canonical ID `dolphin` and displayed `Dauphin` agree immediately. Exactly one final event is emitted for that confirmation.
- A subsequent avatar edit succeeds without a stale profile-baseline error.
- Automatic incomplete profile → House → Patronus: the background profile updates after House confirmation, one Patronus dialog remains open, no premature final event occurs, then the confirmed Patronus updates the profile, closes the dialog and emits one final event. Completion is stored as `complete`; a subsequent automatic open returns `false`.
- `pagehide` disposes an open modal and does not leave a stale active ceremony.
- No browser exceptions occurred in those probes.

Probe details: `scoped-native-probes.json`; Patronus capture: `personal-patronus-immediate.png`, both beside this report.

Re-ran native scoring and ceremony units from the v2 snapshot: **8/8 PASS**, including all **25,600** Python/native base/optional scoring combinations, catalogue reachability, manual/calculated provenance, canonical revision adapters and per-member draft completion. The E06 references missing from the v1 review copy are present in v2.

Inspected the supplied final six-width modal result log and immediate House RED/GREEN evidence. The focused independent builder re-review also passes: its historical review association transform requires exactly one matching native implementation, fails closed for changed/duplicate implementations, and only alters the generated review copy. That guard test passes; native profile/renderers/responsive/source-builder files are unchanged since v1.

This is a scoped native frontend re-review. Unchanged v1 checks are not rerun as a second full campaign. Module protocol preservation and access/backend fixes are covered separately by their assigned review. Live accounts/invitations, production deployment and physical mobile-keyboard behavior are not certified here.
