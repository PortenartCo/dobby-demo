# Existing native import dependencies, hosted locally

These are the exact PDF.js 3.11.174 and Tesseract.js/core 5.1.1 client dependencies referenced by the original DOBBY smart import, plus French language data. No new business engine or persistence is introduced. `provenance.json` records URL, byte count and SHA256; licenses accompany the assets.

The V7 presentation loader redirects native worker/library requests to these local files. PDF.js receives `isEvalSupported:false` (including native calls); workers remain local. Tesseract uses `cacheMethod:none`, avoiding a second persistent language-data cache. Recognition runs in the browser. Native parsing, duplicate checks, confirmation and storage remain unchanged. The evidence uses an actual text PDF and a canvas-rendered French OCR fixture with external requests blocked. This does not qualify accuracy on arbitrary documents or a production security upgrade of the inherited runtimes.
