# Final contracts review — 2026-11-13

**Specification verdict: ready for integration within the documented client-side scope.**

**Quality verdict: ready; no remaining blockers in the reviewed implementation and corrective patch.**

The initial review covered the complete staged branch against the approved specification. The follow-up review checked the reported native persistence, synchronization, permissions and PDF-preview fixes and their interactions. No production files were changed by the reviewer.

Confirmed resolutions:

- Piece and record removals persist metadata before local binary cleanup. Failed saves retain metadata and bytes; shared bytes are preserved. Cleanup failures return an accurate notice.
- A remotely withdrawn contract with a local copy remains local and is excluded from household payloads, including after unrelated edits. An authoritative modern restoration clears that local-only state and survives later unrelated edits. Both sequences passed an independent native-module harness reproduction.
- Chromium confirmed that a child cannot delete a piece-free shared contract through Archives: the control is disabled, and the raw native legacy action is rejected before confirmation. The native guards also cover shared legacy submit, detach and file-input paths while preserving private Archives behavior.
- Actual V7 piece removal and whole-record removal both display the server-retention disclosure after navigation.
- The PDF sandbox regression discovered during follow-up was removed. A readable one-page PDF displayed the native Chromium toolbar and page after that restriction was removed. Unsupported HTML MIME is refused by the preview path.
- Generic Archives editing and reloading preserved nested contract metadata, attachments, source associations and unknown extension fields.

The initial review found no further blocker in calendar calculations, unknown dates, JSON/ZIP limits and source associations, manual form persistence, or route/build integration. Focused regression tests were added by the implementation owners; previously passed broad suites were not rerun by this reviewer.

**Operational limits:** removing a shared piece or contract retains its server binary. Physical deletion requires a distinct manual intervention; no background cleanup is scheduled or promised. Live Supabase permissions and access between two real household accounts remain unverified by this review. Reminder dates remain an échéancier, without a claim of automatic notification delivery. Integration, CI and hosted deployment verification remain separate release steps.
