const path = require('node:path');
const resolve = path.resolve;
const evidence = '/workspace/dobby-v7-menu-simplification/docs/dobby-v7/evidence';
const output = '/tmp/dobby-menu/cross-module-evidence';
path.resolve = function (...args) { const result = resolve.apply(this, args); return result === evidence || result.startsWith(evidence + '/') ? output + result.slice(evidence.length) : result; };
