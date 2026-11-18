# DOBBY seasonal event visual refinement

Approved execution spec: GitHub issue #21, visual hierarchy update of 2026-11-17; base fa37fd2967b84b2e3caf50198f75391d41370afd; continue PR #26.

Design: retain all quiet season styling and the original illustration. Reuse the existing visual adapter, native particles, calendar and preferences. A single inline SVG symbol library provides evergreen/holly/gifts, carved pumpkins/lanterns/bats, metallic ribbons/stars/confetti and intermediate-event motifs. Place ornaments in hero corners and desktop side space; theme the existing header and welcome panel without moving their controls or changing layout dimensions. Animation is secondary; complete event identity remains when effects are OFF. No new dependency, asset request, storage or service.

- [x] Run existing seasonal and 14 transverse checks before edits; capture four events at four widths against the exact base source.
- [x] Add static visual acceptance: structured header/hero, major welcome dressing, click-through, no overflow, unchanged image/header/dock, bounded vector DOM, effects OFF, intermediate motifs and cleanup.
- [x] Implement in seasonal-effects.js/css only. Calendar, preferences, protected builder and historical manifests unchanged.
- [x] Verify four seasons at 390/1440; a desktop font-rule leak was reproduced and corrected by scoping it to event levels. All eight season images are byte-identical.
- [x] Independent read-only visual/code review; no material issue beyond the corrected typography scope.
- [ ] Complete configured npm campaign, publish an immutable independent review directory, obtain all new-head CI, keep PR #26 draft.

Evidence: docs/dobby-v7/seasonal/visual-review. No application merge or promotion to main; only the separately authorized additive preview folder may be published there.
