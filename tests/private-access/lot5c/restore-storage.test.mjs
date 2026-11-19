// Real loopback Storage API export and import. No storage.objects row replay.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { id } from '../local-db.mjs';
import { startStorage, stopStorage, unrelatedBucket } from '../lot2b/local-storage.mjs';
import { nativeTransport, familyBucket } from '../lot2b/native-transport.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtures = [
 { bucket: familyBucket, key: id(101) + '/nested/recovery.pdf', bytes: Buffer.from('%PDF-1.4\nFictional family recovery\n') },
 { bucket: unrelatedBucket, key: 'separate.pdf', bytes: Buffer.from('%PDF-1.4\nFictional unrelated recovery\n') },
];
function buckets(storage) {
 return storage.sql("SELECT id,public,file_size_limit,allowed_mime_types::text FROM storage.buckets ORDER BY id;");
}
function objectInventory(storage) {
 return storage.sql("SELECT bucket_id,name,owner_id,metadata->>'mimetype' FROM storage.objects ORDER BY bucket_id,name;");
}

test('fixture object export and upload restore bytes and access through real Storage HTTP', {timeout:240_000}, async () => {
 const directory = mkdtempSync(join(tmpdir(), 'dobby-storage-restore-'));
 try {
  const source = await startStorage();
  const origin = nativeTransport(source, 2);
  const inventory = [];
  for (const [index, item] of fixtures.entries()) {
   assert.ok((await origin.upload(item.key, item.bytes, {bucket:item.bucket})).ok, 'Seed real source object');
   const downloaded = await origin.download(item.key, item.bucket);
   assert.ok(downloaded.ok, 'Export over HTTP');
   assert.deepEqual(downloaded.bytes, item.bytes);
   const file = 'object-' + index + '.bin';
   writeFileSync(join(directory,file), downloaded.bytes, {mode:0o600,flag:'wx'});
   inventory.push({bucket:item.bucket,key:item.key,file,bytes:downloaded.bytes.length,sha256:hash(downloaded.bytes)});
  }
  const manifest = {buckets:buckets(source),objects:objectInventory(source),inventory};
  const file = join(directory,'inventory.json');
  writeFileSync(file, JSON.stringify(manifest), {mode:0o600,flag:'wx'});
  await stopStorage();

  const target = await startStorage();
  const saved = JSON.parse(readFileSync(file,'utf8'));
  assert.equal(buckets(target),saved.buckets);
  assert.equal(objectInventory(target),'');
  const destination = nativeTransport(target,2);
  for (const item of saved.inventory) {
   const bytes = readFileSync(join(directory,item.file));
   assert.equal(bytes.length,item.bytes);
   assert.equal(hash(bytes),item.sha256);
   assert.ok((await destination.upload(item.key,bytes,{bucket:item.bucket})).ok, 'Restore via HTTP upload');
   const restored = await destination.download(item.key,item.bucket);
   assert.ok(restored.ok, 'Read object in fresh Storage fixture');
   assert.equal(hash(restored.bytes),item.sha256);
  }
  assert.equal(objectInventory(target),saved.objects);
  const family = fixtures[0];
  assert.ok(!(await nativeTransport(target,3).download(family.key,family.bucket)).ok, 'Other household denied');
  assert.ok(!(await nativeTransport(target,target.anonToken).download(family.key,family.bucket)).ok, 'Anonymous denied');
  console.log('LOT5C_STORAGE_RESTORE', saved.inventory.length, 'objects across 2 private buckets; hash, size, path, owner and MIME matched; cross-household and anon denied');
 } finally {
  try { await stopStorage(); } finally { rmSync(directory,{recursive:true,force:true}); }
 }
});
