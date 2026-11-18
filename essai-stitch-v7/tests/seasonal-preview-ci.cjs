/* Reuse the existing disposable review fixture and clean up on every exit. */
const path=require('node:path'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
let directory;
require('./integrated-preview-fixture.cjs').withIntegratedPreview({repo,origin,
 build(output){directory=output;execFileSync(process.execPath,[path.join(repo,'scripts/build-dobby-seasonal-review.cjs'),'--allow-dirty','--output',output],{cwd:repo,stdio:'inherit'});},
 test(base){execFileSync(process.execPath,[path.join(__dirname,'seasonal-review.cjs')],{cwd:repo,stdio:'inherit',env:{...process.env,DOBBY_SEASONAL_REVIEW_BASE:base,DOBBY_SEASONAL_REVIEW_DIR:directory}});}
});
