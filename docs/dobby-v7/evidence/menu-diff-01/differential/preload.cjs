'use strict';
// Identical non-mutating observation layer for both frozen worktrees.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const output = process.env.DIFF_OUTPUT_DIR;
const root = process.env.DIFF_WORKTREE_ROOT;
fs.mkdirSync(output, {recursive: true});
const logFile = path.join(output, 'calls.jsonl');
let sequence = 0, pageSequence = 0;
const record = (event, detail = {}) => fs.appendFileSync(logFile, JSON.stringify({sequence: ++sequence, event, ...detail}) + '\n');
const resolve = path.resolve;
path.resolve = function (...args) {
  const result = resolve.apply(this, args);
  const evidence = root + '/docs/dobby-v7/evidence';
  return result === evidence || result.startsWith(evidence + '/') ? output + '/screenshots' + result.slice(evidence.length) : result;
};
record('environment', {node: process.version, execPath: process.execPath, cwd: process.cwd(), TZ: process.env.TZ, origin: process.env.DOBBY_TEST_ORIGIN, chromium: process.env.CHROMIUM_PATH, modulePath: process.env.NODE_PATH, argv: process.argv});
const originalLoad = Module._load;
const marked = new WeakSet();
const metadata = new WeakMap();
const serialize = value => {
  if (typeof value === 'function') return value.toString();
  if (Buffer.isBuffer(value)) return {bufferBytes: value.length};
  if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value, (k,v) => Buffer.isBuffer(v) ? {bufferBytes:v.length} : v));
  return value;
};
function wrapMethod(object, method, pageInfo, locator = false) {
  if (!object || typeof object[method] !== 'function') return;
  const original = object[method];
  if (marked.has(original)) return;
  const replacement = function (...args) {
    const meta = pageInfo || metadata.get(this) || {};
    const action = {page:meta.page, viewport:meta.viewport, method, ...(locator ? {selector: this.toString()} : {}), args:args.map(serialize), callsite:new Error('API call').stack};
    record('api_call', action);
    const start = performance.now();
    try {
      const result = original.apply(this, args);
      if (!result || typeof result.then !== 'function') return result;
      return result.then(value => value, async error => {
        const failure = {...action, elapsedMs:performance.now()-start, name:error.name, message:error.message, stack:error.stack};
        if (locator) {
          try {
            failure.dom = await this.evaluateAll(elements => elements.slice(0,3).map(el => ({tag:el.tagName,id:el.id,type:el.getAttribute('type'),disabled:el.disabled,ariaDisabled:el.getAttribute('aria-disabled'),readOnly:el.readOnly,hidden:el.hidden,inert:!!el.closest('[inert]'),form:el.closest('form')?.id,description:el.getAttribute('title')||el.getAttribute('aria-label'),nearbyText:el.closest('label,form,section')?.textContent?.replace(/\s+/g,' ').slice(0,700)})));
          } catch (observationError) { failure.observationError = observationError.message; }
        }
        record('api_error', failure);
        throw error;
      });
    } catch (error) {record('api_error', {...action,elapsedMs:performance.now()-start,name:error.name,message:error.message,stack:error.stack});throw error;}
  };
  marked.add(replacement);
  object[method] = replacement;
}
function observePage(page, info) {
  metadata.set(page, info);
  record('page_created', info);
  for (const method of ['goto','reload','goBack','waitForFunction','waitForURL','waitForEvent','evaluate','screenshot']) wrapMethod(page,method,info);
  const originalLocator = page.locator;
  page.locator = function (...args) {
    const locator = originalLocator.apply(this,args);
    metadata.set(locator,info);
    const prototype = Object.getPrototypeOf(locator);
    for (const method of ['fill','click','selectOption','waitFor','focus','uncheck','check','setInputFiles']) wrapMethod(prototype,method,null,true);
    // Chaining creates new locators. Associate them with their originating page.
    for (const method of ['first','last','nth','locator','filter']) {
      if (typeof prototype[method] !== 'function' || marked.has(prototype[method])) continue;
      const original = prototype[method];
      const replacement = function (...values) {const result=original.apply(this,values);metadata.set(result,metadata.get(this)||info);return result;};
      marked.add(replacement); prototype[method]=replacement;
    }
    return locator;
  };
  page.on('pageerror', error => record('page_error', {...info,message:error.message,stack:error.stack}));
  page.on('requestfailed', request => record('request_failed', {...info,url:request.url(),failure:request.failure()}));
}
Module._load = function (request,parent,isMain) {
  const loaded = originalLoad.apply(this, arguments);
  if (request === 'playwright' && !marked.has(loaded.chromium)) {
    marked.add(loaded.chromium);
    const launch = loaded.chromium.launch;
    loaded.chromium.launch = async function (...args) {
      record('browser_launch', {args});
      const browser = await launch.apply(this,args);
      record('browser_version',{version:browser.version()});
      const newContext = browser.newContext;
      browser.newContext = async function (options) {
        const context = await newContext.call(this,options);
        const newPage = context.newPage;
        context.newPage = async function (...args) {const page=await newPage.apply(this,args);observePage(page,{page:++pageSequence,viewport:options.viewport});return page;};
        record('context_created', {options});
        return context;
      };
      return browser;
    };
  }
  if ((request === 'node:assert/strict' || request === 'node:assert') && !marked.has(loaded)) {
    marked.add(loaded);
    for (const key of ['ok','equal','notEqual','deepEqual','notDeepEqual','strictEqual','deepStrictEqual','match','doesNotMatch','throws','rejects']) {
      if (typeof loaded[key] !== 'function') continue;
      const original = loaded[key];
      loaded[key] = function (...args) {try {return original.apply(this,args);} catch(error) {record('assertion_error',{method:key,message:error.message,stack:error.stack,actual:error.actual,expected:error.expected,operator:error.operator});throw error;}};
    }
  }
  return loaded;
};
for (const method of ['log','error']) {
  const original = console[method];
  console[method] = function (...args) {record('console_'+method,{args:args.map(arg=>arg instanceof Error?{name:arg.name,message:arg.message,stack:arg.stack}:serialize(arg))});return original.apply(this,args);};
}
process.on('exit',code=>record('process_exit',{code}));
