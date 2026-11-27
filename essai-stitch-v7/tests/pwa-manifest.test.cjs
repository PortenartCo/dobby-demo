'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');

const directory = join(__dirname, '..');
const read = file => readFileSync(join(directory, file), 'utf8');

test('DOBBY has a distinct install identity and keeps its native Auth entry within the deployment', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const url = new URL('https://example.test/famille/dobby/essai-stitch-v7/manifest.webmanifest');
  const resolve = value => new URL(value, url);
  assert.equal(manifest.lang, 'fr');
  assert.equal(manifest.name, 'DOBBY');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.prefer_related_applications, false);
  assert.equal(resolve(manifest.id).pathname, '/famille/dobby/');
  assert.equal(resolve(manifest.scope).pathname, '/famille/dobby/');
  assert.equal(resolve(manifest.start_url).href, 'https://example.test/famille/dobby/essai-stitch-v7/famille.html#access');
});

test('the four native roots and public relay link the manifest and Apple icon', () => {
  for (const file of ['index.html', 'traverse.html', 'missions.html', 'famille.html', '../index.html']) {
    const html = read(file);
    const prefix = file.startsWith('../') ? './essai-stitch-v7/' : './';
    assert.ok(html.includes(`rel="manifest" href="${prefix}manifest.webmanifest"`), file);
    assert.ok(html.includes(`rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/pwa/apple-touch-icon.png"`), file);
    if (!file.startsWith('../')) {
      assert.ok(html.includes('src="./pwa-install.js"'), file);
      assert.ok(html.includes('href="./pwa-install.css"'), file);
      assert.ok(html.includes('id="dv7-engine" referrerpolicy="same-origin" src="../essai-stitch-v5-famille/index.html#dobby-v7-engine"'), file);
      assert.ok(html.indexOf('src="./access-entry.js"') < html.indexOf('id="dv7-engine"'), file);
    }
  }
});

test('Android, desktop and iOS have real PNG assets in their declared sizes', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const icons = [...manifest.icons, {src:'assets/pwa/apple-touch-icon.png',sizes:'180x180',type:'image/png',purpose:'apple'}];
  assert.deepEqual(manifest.icons.map(icon => [icon.sizes,icon.purpose]), [
    ['192x192','any'], ['512x512','any'], ['512x512','maskable']
  ]);
  for (const icon of icons) {
    assert.equal(icon.type, 'image/png');
    assert.match(icon.src, /^assets\/pwa\//);
    const bytes = readFileSync(join(directory, icon.src));
    assert.equal(bytes.subarray(1, 4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20),icon.sizes);
  }
});
