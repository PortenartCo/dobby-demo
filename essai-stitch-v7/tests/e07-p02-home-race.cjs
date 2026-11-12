/* Regression: a native pull must not erase a queued shared availability edit.
   HTTP fixture only; production code is loaded unchanged. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Reuse the shared-home fixture and login without running its full scenario.
// Keep this regression in its own file while the main scenario owns its runner.
const fixtureFile = path.join(__dirname, 'e07-p02-shared-home.cjs');
const fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
const runnerStart = fixtureSource.indexOf('\n(async()=>{');
assert.ok(runnerStart > 0, 'The shared-home fixture has a separate async runner');
const { fixture, login, native, settle, item, chromium, carrot } = new Function(
  'require', '__dirname',
  fixtureSource.slice(0, runnerStart) +
    '\nreturn {fixture,login,native,settle,item,chromium,carrot};'
)(require, __dirname);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox']
  });
  try {
    const server = fixture();
    const client = await login(browser, server, 'A');
    const { page } = client;
    const writesBefore = server.writes.length;

    await page.evaluate(async id => {
      const win = DobbyCuisineEngine.win();
      const grocery = win.DobbyFamilyUI.grocery;
      const snapshot = grocery.read();
      const source = snapshot.items.find(row => row.id === id);
      if (!source || source.syncState !== 'clean') throw Error('Expected a clean fixture article');

      const request = win.indexedDB.open('dobby-v5-household-preview-v2');
      const db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const control = win.__sharedHomeRace = {
        released: false, itemTransactions: 0, groupComplete: false
      };

      // Observe browser storage scheduling without exposing production internals.
      const prototype = win.IDBDatabase.prototype;
      const originalTransaction = prototype.transaction;
      prototype.transaction = function (stores, mode, ...rest) {
        const names = typeof stores === 'string' ? [stores] : Array.from(stores);
        if (mode === 'readwrite' && names.includes('items')) control.itemTransactions++;
        return originalTransaction.call(this, stores, mode, ...rest);
      };
      control.restore = () => { prototype.transaction = originalTransaction; db.close(); };

      // A genuine open IDB transaction holds both the group edit and the pull's
      // following write. Repeated requests keep it active until explicitly released.
      const blocker = db.transaction('items', 'readwrite');
      const store = blocker.objectStore('items');
      const keepAlive = () => {
        const read = store.get('__shared_home_race_blocker__');
        read.onsuccess = () => { if (!control.released) keepAlive(); };
      };
      keepAlive();
      control.blockerDone = new Promise((resolve, reject) => {
        blocker.oncomplete = resolve;
        blocker.onabort = () => reject(blocker.error || Error('Storage blocker aborted'));
      });

      // Both operations use the real public family adapter. The group edit is
      // queued first; sync then receives the older remote row while IDB is held.
      control.group = grocery.editGroup([
        { id, expected: source, values: { at_home_quantity: 200 } }
      ], snapshot.context).then(() => { control.groupComplete = true; });
      control.sync = grocery.sync();
    }, carrot);

    // The blocker, group edit and pull write must all have been scheduled before
    // releasing IDB. This is deterministic and needs no timing-based sleep.
    await page.waitForFunction(() =>
      DobbyCuisineEngine.win().__sharedHomeRace.itemTransactions >= 3
    );
    assert.equal(await page.evaluate(() =>
      DobbyCuisineEngine.win().__sharedHomeRace.groupComplete
    ), false, 'The group edit is still waiting behind the storage blocker');
    await page.evaluate(async () => {
      const control = DobbyCuisineEngine.win().__sharedHomeRace;
      control.released = true;
      await control.blockerDone;
      await control.group;
      await control.sync;
    });
    await settle(page);

    const actual = await item(page);
    assert.equal(actual.atHomeQty, 200,
      'A successful queued availability edit must survive a concurrent native pull');
    assert.equal(actual.qty, 300, 'The remaining quantity still reflects the queued edit');
    assert.equal(server.rows.get(carrot).at_home_quantity, 200,
      'The surviving pending edit reaches the server through the native writer');
    assert.ok(server.writes.slice(writesBefore).some(write =>
      write.accepted && write.body.at_home_quantity === 200
    ), 'Native CAS accepted the availability edit');

    await page.reload();
    await page.waitForFunction(() => window.DobbyCuisine?.ready);
    await settle(page);
    assert.equal((await item(page)).atHomeQty, 200,
      'The edit also survives reloading the native IndexedDB cache');
    console.log('CUISINE_SHARED_HOME_RACE_PASS queued group edit survives concurrent pull, CAS and reload');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
