# MENU-DIFF-01 — Functional acceptance B

Scope: the five Menu categories and their existing native modules. This focused test does not run the broad suite or repeat the 15 removed-route checks from `tests/menu.cjs`.

## Reproduce

From the repository root, with the existing local source server on port 8765:

```sh
node essai-stitch-v7/tests/menu-diff-acceptance.cjs
```

For a review copy, give the application directory, including the trailing slash and any review prefix:

```sh
DOBBY_MENU_BASE='http://127.0.0.1:8772/essai-stitch-v7/' DOBBY_MENU_RUN=preview node essai-stitch-v7/tests/menu-diff-acceptance.cjs
```

Each run writes its own `results.json`, plus exactly three functional Menu screenshots (`320`, `390`, and `1440` px). The log is retained alongside the results. These captures document the functional Menu state and do not constitute a broader visual review.

## Assertions

- Five ordered semantic links: Maison & Équipements, Archives documentaires, Contrats & Assurances, Contacts, Paramètres; real native destinations and touch targets.
- One Menu title, search immediately below it, cards immediately below search; no decorative hero, contextual header, additional Menu buttons, duplicate global bars or preference controls.
- Eleven immediate search cases covering mixed case, accents, whitespace, empty query and no matches; clear restores all cards and keyboard focus; native transverse search remains unchanged.
- Maison: actual equipment card → equipment detail → maintenance history and existing maintenance form → native equipment JSON download containing the TEST equipment and maintenance record.
- Archives: actual document card → document detail → native local PDF attachment upload and native download, with exact byte equality.
- Contrats: existing canonical E08 module → actual TEST contract detail; native edit and attachment controls remain accessible.
- Contacts: actual contact → existing enabled native edit form, populated from the TEST contact.
- Paramètres: explicit return to Menu; existing backup entry → complete native JSON export and native validation; original TEST records and attachment bytes are present.
- Genuine native restore: remove transient local records and replace the local attachment bytes, choose the exported JSON through `#rg-restore-file`, verify that preview alone changes nothing, click the existing restore command, accept the actual native replacement confirmation, and assert complete restoration of the original TEST records and bytes. A real reload verifies persistence.
- A raw localStorage sentinel in the prior `dobby-review-v7-famille-20261112|` namespace is created before the envelope loads, remains identical after native replacement and reload, and cannot be silently recreated by the setup after reload.
- All modules return to Menu through existing UI. The header is positioned below the actual optional review banner, the dock remains at the viewport bottom, and the last card stays reachable above the dock at a 480 px viewport height.

## Isolation

Each width uses a fresh Chromium context with ephemeral TEST fixtures. Fixture seeding and the transient mutation affect only the test's native local state. Attachment upload, downloads, validation and restoration execute the existing native handlers; no writer or restore logic is replaced. The test allows network requests only to the supplied base origin and aborts every other origin. No real account or external backend is used. Preview runs may use the review copy's own simulated family context.

## Source result

PASS at 320, 390 and 1440 px: 24 named assertion groups, including three actual native restore confirmations. See `source/results.json` for the precise source SHA, export hashes, geometry, attachment hashes and times; `source/run.log` contains the full targeted command output. No uncaught browser error occurred.

## Isolated preview result

PASS at 320, 390 and 1440 px against `http://127.0.0.1:8772/essai-stitch-v7/`: 24 named assertion groups, including three actual native restore confirmations and preservation of the prior Famille namespace sentinel. `preview/results.json` and `preview/run.log` retain the separate evidence. The existing 120 px review banner is measured; the fixed global header follows its bottom. No external-origin request or uncaught browser error occurred in the preview run.

The final source and preview runs use repository candidate `bd3a52aa3108da0444942b8267f7b5bd43a9a80b`; its core application runtime remains the frozen `3f7fe0e36e1e142cefaada5d575196c436b444e4` runtime. No production source or existing test was edited by this acceptance work. Preview publication and the separate simulated A/B multi-client recipe are outside this focused test.
